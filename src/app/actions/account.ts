"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { check, run, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { EMPTY_ME, loadMe } from "@/lib/server/me";
import { allow } from "@/lib/server/rate";
import { supabaseServer } from "@/lib/supabase/server";

// Hesap, KVKK ve kötüye kullanım aksiyonları (kararlar.md Bölüm 13; yapilacaklar.md 9 ve 10).

/** Google ile gelenler kayıt formunu görmediği için açık rıza onboarding'de alınır. */
export async function acceptKvkk() {
  return run(async () => {
    const user = await requireUser();
    await db().from("profiles").update({ kvkk_accepted_at: new Date().toISOString() }).eq("id", user.id).is("kvkk_accepted_at", null);
    return loadMe(user.id, user.email);
  });
}

const DeleteInput = z.object({ password: z.string().max(72).optional(), confirm: z.string().trim() });

/**
 * Hesabı siler: şifre (e-postayla açılan hesapta) tekrar istenir, sonra auth kullanıcısı silinir; veritabanı cascade ile
 * bütün kişisel veriyi (profil, projeler ve dosya özetleri, onaylar, mesajlar, puan geçmişi) temizler. Takım sohbetindeki
 * mesajlar "Silinmiş kullanıcı" olarak kalır (takımın geçmişi bozulmasın).
 */
export async function deleteAccount(input: z.input<typeof DeleteInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = DeleteInput.parse(input);
    if (v.confirm.toLocaleUpperCase("tr") !== "SİL") throw new UserError("Onaylamak için kutuya SİL yaz.");
    if (!(await allow(user.id, "delete_account", 5, 1))) throw new UserError("Çok fazla deneme oldu. Biraz sonra tekrar dene.");

    const { data } = await db().auth.admin.getUserById(user.id);
    const hasPassword = (data.user?.identities ?? []).some((i) => i.provider === "email");
    if (hasPassword) {
      if (!v.password) throw new UserError("Şifreni yaz.");
      // Oturumu etkilemeyen ayrı bir istemciyle şifre kontrolü.
      const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await probe.auth.signInWithPassword({ email: user.email, password: v.password });
      if (error) throw new UserError("Şifre yanlış.");
      await probe.auth.signOut();
    }

    const del = await db().auth.admin.deleteUser(user.id);
    if (del.error) throw new Error(`hesap silme: ${del.error.message}`);
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    return EMPTY_ME;
  });
}

/** Verilerimi indir (KVKK m. 11): kullanıcının bütün verisi JSON. Günde 3 kez. */
export async function exportMyData() {
  return run(async () => {
    const user = await requireUser();
    if (!(await allow(user.id, "export", 3, 24))) throw new UserError("Bugün yeterince indirme yaptın. Yarın tekrar dene.");
    const q = (t: string, col = "user_id", cols = "*") => db().from(t).select(cols).eq(col, user.id);
    const [profile, experiences, projects, certificates, approvals, applications, teams, teamMessages, messages, peerGiven, peerReceived, events, notifications, roadmap, badges, credentials, reports, blocks] =
      await Promise.all([
        q("profiles", "id", "username, name, headline, field, school, department, city, github, github_verified, about, interests, skills, education, cv_code, score, league, season_points, kvkk_accepted_at, created_at"),
        q("experiences"),
        q("projects", "user_id", "name, repo_owner, repo_name, description, techs, role, language, demo_url, analysis, reasons, points, status, commit_sha, created_at"),
        q("certificates"),
        q("approvals", "user_id", "target_type, target_label, approver_name, approver_email, relation, status, comment, requested_at, answered_at, points"),
        q("applications"),
        q("team_members"),
        q("team_messages", "user_id", "team_id, text, created_at"),
        q("messages", "sender_id", "conversation_id, text, created_at"),
        q("peer_ratings", "from_user", "competition_id, team_id, stars, note, created_at"),
        q("peer_ratings", "to_user", "competition_id, stars, created_at"),
        q("score_events", "user_id", "source, label, points, season_id, created_at"),
        q("notifications", "user_id", "text, href, read, created_at"),
        q("roadmaps"),
        q("badges"),
        q("credentials", "user_id", "kind, title, status, url, created_at"),
        q("reports", "reporter_id", "target_type, target_id, reason, status, created_at"),
        q("blocks"),
      ]);
    return {
      olusturuldu: new Date().toISOString(),
      eposta: user.email,
      profil: profile.data?.[0] ?? null,
      deneyimler: experiences.data,
      projeler: projects.data,
      sertifikalar: certificates.data,
      onaylar: approvals.data,
      basvurular: applications.data,
      takimlar: teams.data,
      takim_mesajlari: teamMessages.data,
      mesajlar: messages.data,
      verdigin_akran_puanlari: peerGiven.data,
      aldigin_akran_puanlari: peerReceived.data,
      puan_gecmisi: events.data,
      bildirimler: notifications.data,
      yol_haritasi: roadmap.data,
      rozetler: badges.data,
      certifier: credentials.data,
      sikayetlerin: reports.data,
      engellediklerin: blocks.data,
    };
  });
}

const Username = z.string().regex(/^[a-z0-9_-]{3,30}$/, "Geçersiz kullanıcı adı.");

async function idOf(username: string) {
  const r = await db().from("profiles").select("id").eq("username", Username.parse(username)).maybeSingle();
  if (!r.data) throw new UserError("Bu kullanıcı bulunamadı.");
  return (r.data as { id: string }).id;
}

/** Engelle: engellenen kişi mesaj atamaz, bağlantı kuramaz; mevcut bağlantı kalkar. */
export async function blockUser(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await idOf(username);
    if (other === user.id) throw new UserError("Kendini engelleyemezsin.");
    check(await db().from("blocks").upsert({ user_id: user.id, blocked_id: other }, { onConflict: "user_id,blocked_id", ignoreDuplicates: true }), "engelleme");
    await db().from("connections").delete().or(`and(user_id.eq.${user.id},other_id.eq.${other}),and(user_id.eq.${other},other_id.eq.${user.id})`);
    return loadMe(user.id, user.email);
  });
}

export async function unblockUser(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await idOf(username);
    check(await db().from("blocks").delete().eq("user_id", user.id).eq("blocked_id", other), "engel kaldırma");
    return loadMe(user.id, user.email);
  });
}

const ReportInput = z.object({
  targetType: z.enum(["Profil", "Mesaj", "Proje"]),
  targetId: z.string().trim().min(1).max(100),
  username: Username,
  reason: z.string().trim().min(3, "Şikayet sebebini kısaca yaz.").max(500, "En fazla 500 karakter."),
});

/** Şikayet: yönetici sayfasında listelenir. Hedefin bu kullanıcıya ait olduğu sunucuda kontrol edilir. */
export async function reportContent(input: z.input<typeof ReportInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = ReportInput.parse(input);
    if (!(await allow(user.id, "report", 10, 24))) throw new UserError("Bugün çok fazla şikayet gönderdin.");
    const target = await idOf(v.username);
    if (target === user.id) throw new UserError("Kendini şikayet edemezsin.");
    if (v.targetType === "Proje") {
      const p = await db().from("projects").select("id").eq("id", z.string().uuid().parse(v.targetId)).eq("user_id", target).maybeSingle();
      if (!p.data) throw new UserError("Bu proje bulunamadı.");
    }
    if (v.targetType === "Mesaj") {
      // Sadece kendi sohbetindeki bir mesaj şikayet edilebilir.
      const m = await db().from("messages").select("conversation_id, sender_id").eq("id", Number(v.targetId)).maybeSingle();
      const row = m.data as { conversation_id: string; sender_id: string } | null;
      if (!row || row.sender_id !== target) throw new UserError("Bu mesaj bulunamadı.");
      const c = await db().from("conversations").select("user_a, user_b").eq("id", row.conversation_id).single();
      const cv = c.data as { user_a: string; user_b: string };
      if (cv.user_a !== user.id && cv.user_b !== user.id) throw new UserError("Bu mesaj bulunamadı.");
    }
    check(await db().from("reports").insert({ reporter_id: user.id, target_user: target, target_type: v.targetType, target_id: v.targetId, reason: v.reason }), "şikayet");
    return true;
  });
}

/** Sezon sonu konfetisi bir kez gösterilir. */
export async function markSeasonSeen() {
  return run(async () => {
    const user = await requireUser();
    await db().from("season_results").update({ seen: true }).eq("user_id", user.id).eq("seen", false);
    return true;
  });
}
