"use server";

import { z } from "zod";
import { run, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { currentUser, requireUser } from "@/lib/server/auth";
import { EMPTY_ME, loadMe } from "@/lib/server/me";
import { ensureProfile } from "@/lib/server/profile-init";
import { allowKey, clientIp } from "@/lib/server/rate";
import { supabaseServer } from "@/lib/supabase/server";

const site = () => process.env.SITE_URL ?? "http://localhost:3000";

const Email = z.string().trim().toLowerCase().max(254).email("Geçerli bir e-posta gir.");
const Password = z.string().min(8, "Şifre en az 8 karakter olmalı.").max(72, "Şifre en fazla 72 karakter olabilir.");

const RegisterInput = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Adını ve soyadını yaz.")
    .max(80, "Ad çok uzun.")
    .refine((v) => v.split(/\s+/).length >= 2, "Adını ve soyadını yaz."),
  email: Email,
  password: Password,
  kvkk: z.literal(true, { error: "Devam etmek için aydınlatma metnini okuyup onay vermelisin." }),
});

export async function register(input: z.input<typeof RegisterInput>) {
  return run(async () => {
    const { name, email, password } = RegisterInput.parse(input);
    if (!(await allowKey(await clientIp(), "register", 5, 60))) throw new UserError("Bu bağlantıdan çok fazla kayıt denemesi oldu. Bir saat sonra tekrar dene.");
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${site()}/auth/confirm?next=/onboarding` },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) throw new UserError("Bu e-postayla bir hesap var. Giriş yap.");
      if (/password/i.test(error.message)) throw new UserError("Şifre çok zayıf. Harf ve rakam karışık, en az 8 karakter kullan.");
      if (/rate limit|too many/i.test(error.message)) throw new UserError("Çok fazla deneme oldu. Birkaç dakika sonra tekrar dene.");
      throw new Error(`kayıt: ${error.message}`);
    }
    // Supabase, kayıtlı e-postayla yeniden kayıtta hata vermeden kimliksiz kullanıcı döndürür.
    if (!data.user || data.user.identities?.length === 0) throw new UserError("Bu e-postayla bir hesap var. Giriş yap.");
    await ensureProfile(data.user.id, name);
    // KVKK: açık rıza zamanı (aydınlatma metni + yurt dışına aktarım).
    await db().from("profiles").update({ kvkk_accepted_at: new Date().toISOString() }).eq("id", data.user.id);
    if (!data.session) return { needsConfirm: true as const, me: EMPTY_ME };
    return { needsConfirm: false as const, me: await loadMe(data.user.id, email) };
  });
}

const LoginInput = z.object({ email: Email, password: z.string().min(1, "Şifreni yaz.").max(72) });

export async function login(input: z.input<typeof LoginInput>) {
  return run(async () => {
    const { email, password } = LoginInput.parse(input);
    if (!(await allowKey(email, "login", 10, 15))) throw new UserError("Bu hesapla çok fazla giriş denemesi oldu. 15 dakika sonra tekrar dene.");
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      if (error && /not confirmed/i.test(error.message)) throw new UserError("Önce e-postanı doğrula. Gelen kutundaki linke tıkla.");
      if (error && /rate limit|too many/i.test(error.message)) throw new UserError("Çok fazla deneme oldu. Birkaç dakika sonra tekrar dene.");
      throw new UserError("E-posta ya da şifre yanlış.");
    }
    await ensureProfile(data.user.id, (data.user.user_metadata?.name as string) || email.split("@")[0]);
    return loadMe(data.user.id, data.user.email ?? email);
  });
}

/** Jüri ve deneme için hazır hesap (Deniz Kaya). Şifre sadece sunucuda. */
export async function demoLogin() {
  return run(async () => {
    if (!process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD) throw new UserError("Demo hesabı bu ortamda kapalı.");
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD });
    if (error || !data.user) throw new UserError("Demo hesabına şu an girilemiyor.");
    return loadMe(data.user.id, data.user.email ?? "");
  });
}

export async function logout() {
  return run(async () => {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    return EMPTY_ME;
  });
}

/** Sayfa yenilemeden güncel durumu almak için. */
export async function refreshMe() {
  return run(async () => {
    const user = await currentUser();
    return user ? loadMe(user.id, user.email) : EMPTY_ME;
  });
}

const ResetInput = z.object({ email: Email });

export async function requestPasswordReset(input: z.input<typeof ResetInput>) {
  return run(async () => {
    const { email } = ResetInput.parse(input);
    const supabase = await supabaseServer();
    // Hesap var mı yok mu belli etmemek için sonuç ne olursa olsun aynı cevap; sınır aşılınca e-posta gitmez.
    if (!(await allowKey(email, "reset", 3, 60))) return true;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site()}/auth/confirm?next=/sifre-yenile` });
    return true;
  });
}

const NewPassword = z.object({ password: Password });

export async function setNewPassword(input: z.input<typeof NewPassword>) {
  return run(async () => {
    const { password } = NewPassword.parse(input);
    await requireUser();
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new UserError(/same/i.test(error.message) ? "Yeni şifre eskisiyle aynı olamaz." : "Şifre güncellenemedi. Linkin süresi dolmuş olabilir.");
    return true;
  });
}
