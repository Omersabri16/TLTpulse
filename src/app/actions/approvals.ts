"use server";

import { z } from "zod";
import { referencePoints } from "@/lib/score";
import { check, run, text, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { APPROVAL_DAYS, newToken, TOKEN_RE, tokenHash } from "@/lib/server/approval";
import { requireUser } from "@/lib/server/auth";
import { sendApprovalEmail } from "@/lib/server/mail";
import { loadMe, syncScore } from "@/lib/server/me";
import { notify, scoreEvent } from "@/lib/server/notify";
import { allow } from "@/lib/server/rate";

const site = () => process.env.SITE_URL ?? "http://localhost:3000";

const Target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("experience"), id: z.string().uuid() }),
  z.object({ type: z.literal("project"), id: z.string().uuid() }),
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
    let targetType: "experience" | "project" = "experience";
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
    } else {
      const p = await db().from("projects").select("id, name").eq("id", t.id).eq("user_id", user.id).maybeSingle();
      if (!p.data) throw new UserError("Bu proje bulunamadı.");
      const x = p.data as { id: string; name: string };
      targetType = "project";
      targetId = x.id;
      targetLabel = `${x.name} projesi`;
    }
    const pending = await db().from("approvals").select("id").eq("user_id", user.id).eq("target_id", targetId).eq("approver_email", v.approverEmail).eq("status", "Bekliyor").maybeSingle();
    if (pending.data) throw new UserError("Bu kişiden bu bilgi için bekleyen bir onay isteğin zaten var.");

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
      .select("id, user_id, approver_name, approver_email, target_label, status, expires_at")
      .eq("token_hash", hash)
      .maybeSingle();
    const a = found.data as { id: string; user_id: string; approver_name: string; approver_email: string; target_label: string; status: string; expires_at: string } | null;
    if (!a || a.status !== "Bekliyor" || new Date(a.expires_at).getTime() < Date.now()) throw new UserError("Bu onay linki geçersiz, süresi dolmuş ya da daha önce kullanılmış.");

    const comment = v.approve ? v.comment?.trim() || null : null;
    const points = v.approve ? referencePoints(a.approver_email, !!comment) : 0;
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
    if (v.approve) {
      await scoreEvent(a.user_id, "Referanslar", `${a.approver_name} onayladı: ${a.target_label}`, points);
      await syncScore(a.user_id);
    }
    return { approved: v.approve };
  });
}
