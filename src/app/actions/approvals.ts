"use server";

import { z } from "zod";
import { CERT_POINTS, isDeclared, referencePoints } from "@/lib/score";
import { check, run, text, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { APPROVAL_DAYS, newToken, TOKEN_RE, tokenHash } from "@/lib/server/approval";
import { requireUser } from "@/lib/server/auth";
import { sendApprovalEmail } from "@/lib/server/mail";
import { loadMe, syncScore } from "@/lib/server/me";
import { notify } from "@/lib/server/notify";
import { allow } from "@/lib/server/rate";

const site = () => process.env.SITE_URL ?? "http://localhost:3000";

const Target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("experience"), id: z.string().uuid() }),
  z.object({ type: z.literal("project"), id: z.string().uuid() }),
  z.object({ type: z.literal("certificate"), id: z.string().uuid() }),
  z.object({
    type: z.literal("new"),
    kind: z.enum(["Staj", "İş", "Gönüllü"]),
    title: z.string().trim().min(2, "Deneyimin unvanını yaz.").max(100),
    org: z.string().trim().min(2, "Kurumu yaz.").max(100),
    start: text(30),
    end: text(30),
  }),
]);

const RequestInput = z.object({
  target: Target,
  approverName: z.string().trim().min(2, "Onaylayacak kişinin adını yaz.").max(80),
  approverEmail: z.string().trim().toLowerCase().max(254).email("Geçerli bir e-posta gir."),
  relation: z.enum(["Staj amiri", "Hoca", "İşveren", "Takım arkadaşı"]),
});

/** Amir/hoca onayı ister: tek kullanımlık link e-postayla gider. Link istekte bulunana gösterilmez. */
export async function requestApproval(input: z.input<typeof RequestInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = RequestInput.parse(input);
    if (v.approverEmail === user.email.toLowerCase()) throw new UserError("Kendi e-postanı onaylayıcı olarak giremezsin.");

    const sameApprover = (await db().from("approvals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("approver_email", v.approverEmail)).count ?? 0;
    if (sameApprover >= 3) throw new UserError("Aynı kişiden en fazla 3 onay istenebilir.");
    const since = new Date(Date.now() - 86400_000).toISOString();
    const toThisEmail = (await db().from("approvals").select("id", { count: "exact", head: true }).eq("approver_email", v.approverEmail).gte("requested_at", since)).count ?? 0;
    if (toThisEmail >= 5) throw new UserError("Bu adrese bugün yeterince onay isteği gitti. Yarın tekrar dene.");
    if (!(await allow(user.id, "approval_email", 5, 24))) throw new UserError("Günde en fazla 5 onay isteği gönderebilirsin.");

    // Hedefin etiketi istemciden değil, kullanıcının kendi kaydından gelir.
    let targetType: "experience" | "project" | "certificate" = "experience";
    let targetId: string;
    let targetLabel: string;
    const t = v.target;
    if (t.type === "new") {
      const row = check(
        await db()
          .from("experiences")
          .insert({ user_id: user.id, kind: t.kind, title: t.title, org: t.org, start_label: t.start, end_label: t.end || "Devam ediyor" })
          .select("id")
          .single(),
        "deneyim",
      ) as { id: string };
      targetId = row.id;
      targetLabel = `${t.title} · ${t.org}`;
    } else if (t.type === "experience") {
      const e = await db().from("experiences").select("id, title, org").eq("id", t.id).eq("user_id", user.id).maybeSingle();
      if (!e.data) throw new UserError("Bu deneyim bulunamadı.");
      const x = e.data as { id: string; title: string; org: string };
      targetId = x.id;
      targetLabel = `${x.title} · ${x.org}`;
    } else if (t.type === "certificate") {
      // Sadece beyan edilen (BTK / Credly dışı) sertifika onaylatılır; kaynaktan doğrulanan zaten tam puanlı.
      const c = await db().from("certificates").select("id, name, provider, status").eq("id", t.id).eq("user_id", user.id).maybeSingle();
      if (!c.data) throw new UserError("Bu sertifika bulunamadı.");
      const x = c.data as { id: string; name: string; provider: string; status: Parameters<typeof isDeclared>[0] };
      if (!isDeclared(x.status)) throw new UserError("Sadece beyan edilen sertifikalar için onay istenebilir.");
      targetType = "certificate";
      targetId = x.id;
      targetLabel = `${x.name} sertifikası (${x.provider})`;
    } else {
      const p = await db().from("projects").select("id, name").eq("id", t.id).eq("user_id", user.id).maybeSingle();
      if (!p.data) throw new UserError("Bu proje bulunamadı.");
      const x = p.data as { id: string; name: string };
      targetType = "project";
      targetId = x.id;
      targetLabel = `${x.name} projesi`;
    }
    // Bir deneyim ya da projeye tek onay: birden fazla e-posta hesabı açıp aynı stajı tekrar tekrar onaylatarak puan
    // toplanamasın. Reddedilen ya da süresi dolan istekten sonra yeni istek gönderilebilir.
    const existing = (check(await db().from("approvals").select("id, status, expires_at").eq("user_id", user.id).eq("target_id", targetId), "onay") ?? []) as {
      id: string;
      status: string;
      expires_at: string;
    }[];
    if (existing.some((a) => a.status === "Onaylandı")) throw new UserError("Bu bilgi zaten onaylandı. Bir deneyim, proje ya da sertifika için tek onay alınabilir.");
    const stale = existing.filter((a) => a.status === "Bekliyor" && new Date(a.expires_at).getTime() < Date.now()).map((a) => a.id);
    if (existing.some((a) => a.status === "Bekliyor" && !stale.includes(a.id))) throw new UserError("Bu bilgi için bekleyen bir onay isteğin zaten var. Yanıtlanmasını bekle.");
    if (stale.length) await db().from("approvals").delete().in("id", stale);

    const token = newToken();
    const inserted = check(
      await db()
        .from("approvals")
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          target_label: targetLabel,
          approver_name: v.approverName,
          approver_email: v.approverEmail,
          relation: v.relation,
          token_hash: tokenHash(token),
          expires_at: new Date(Date.now() + APPROVAL_DAYS * 86400_000).toISOString(),
        })
        .select("id")
        .single(),
      "onay",
    ) as { id: string };

    const me = check(await db().from("profiles").select("name").eq("id", user.id).single(), "profil") as { name: string };
    try {
      await sendApprovalEmail(v.approverEmail, { approverName: v.approverName, userName: me.name, targetLabel, relation: v.relation, link: `${site()}/onay/${token}` });
    } catch (e) {
      await db().from("approvals").delete().eq("id", inserted.id);
      console.error("[e-posta]", e instanceof Error ? e.message : e);
      throw new UserError("E-posta gönderilemedi. Adresi kontrol edip tekrar dene.");
    }
    return loadMe(user.id, user.email);
  });
}

const AnswerInput = z.object({
  token: z.string().regex(TOKEN_RE, "Bu onay linki geçersiz."),
  approve: z.boolean(),
  comment: text(500, "Yorum en fazla 500 karakter olabilir.").optional(),
});

/** Onaylayıcının yanıtı. Hesap gerekmez; yetki tek kullanımlık token'dır. */
export async function answerApproval(input: z.input<typeof AnswerInput>) {
  return run(async () => {
    const v = AnswerInput.parse(input);
    const hash = tokenHash(v.token);
    const found = await db()
      .from("approvals")
      .select("id, user_id, target_type, target_id, approver_name, approver_email, target_label, status, expires_at")
      .eq("token_hash", hash)
      .maybeSingle();
    const a = found.data as { id: string; user_id: string; target_type: string; target_id: string; approver_name: string; approver_email: string; target_label: string; status: string; expires_at: string } | null;
    if (!a || a.status !== "Bekliyor" || new Date(a.expires_at).getTime() < Date.now()) throw new UserError("Bu onay linki geçersiz, süresi dolmuş ya da daha önce kullanılmış.");
    if (v.approve) {
      const other = await db().from("approvals").select("id").eq("user_id", a.user_id).eq("target_id", a.target_id).eq("status", "Onaylandı").limit(1);
      if (other.data?.length) throw new UserError("Bu bilgi başka biri tarafından zaten onaylanmış. Teşekkürler, ek bir işlem gerekmiyor.");
    }

    const cert = a.target_type === "certificate";
    if (v.approve && cert) {
      // Aynı sertifika başka bir hesapta doğrulanmış ya da onaylanmışsa ikinci kez puan vermez.
      const c = (await db().from("certificates").select("cert_key, status").eq("id", a.target_id).maybeSingle()).data as { cert_key: string | null; status: string } | null;
      if (!c) throw new UserError("Bu sertifika artık profilde yok.");
      if (c.cert_key) {
        const owned = await db().from("certificates").select("id").eq("cert_key", c.cert_key).in("status", ["Doğrulandı", "Onaylandı"]).neq("id", a.target_id).limit(1);
        if (owned.data?.length) throw new UserError("Bu sertifika başka bir hesapta zaten onaylanmış.");
      }
    }

    const comment = v.approve ? v.comment?.trim() || null : null;
    // Sertifika onayının puanı sertifikaya yazılır (beyan 5 → onaylı 20); referans olarak ayrıca puan getirmez.
    const points = v.approve && !cert ? referencePoints(a.approver_email, !!comment) : 0;
    // Tek kullanımlık: durum hâlâ "Bekliyor" ise güncellenir; aynı anda iki yanıt gelirse biri boş döner.
    const upd = await db()
      .from("approvals")
      .update({ status: v.approve ? "Onaylandı" : "Reddedildi", comment, points, answered_at: new Date().toISOString() })
      .eq("id", a.id)
      .eq("status", "Bekliyor")
      .gt("expires_at", new Date().toISOString())
      .select("id");
    if (!upd.data?.length) throw new UserError("Bu onay linki daha önce kullanılmış.");

    await notify(
      a.user_id,
      v.approve ? `${a.approver_name} onay verdi${comment ? " ve yorum yazdı" : ""}: ${a.target_label}` : `${a.approver_name} onay isteğini reddetti: ${a.target_label}`,
      "/profil",
    );
    if (v.approve && cert) check(await db().from("certificates").update({ status: "Onaylandı", points: CERT_POINTS.approved }).eq("id", a.target_id), "sertifika");
    if (v.approve) await syncScore(a.user_id);
    return { approved: v.approve };
  });
}
