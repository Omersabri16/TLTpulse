import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/server/profile-init";
import { safeNext } from "@/lib/safe";
import { supabaseServer } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "email_change", "invite", "magiclink"];

/** E-posta doğrulama ve şifre sıfırlama linklerinin geldiği yer. Hem token_hash hem PKCE kodu desteklenir. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"), "/profil");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await supabaseServer();

  let userId: string | undefined;
  let name = "";
  if (tokenHash && type && TYPES.includes(type)) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      userId = data.user?.id;
      name = (data.user?.user_metadata?.name as string) ?? "";
    }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      userId = data.user?.id;
      name = (data.user?.user_metadata?.name as string) ?? "";
    }
  }

  if (!userId) return NextResponse.redirect(new URL("/giris?hata=link", url.origin));
  await ensureProfile(userId, name || "Yeni Yazılımcı");
  return NextResponse.redirect(new URL(type === "recovery" ? "/sifre-yenile" : next, url.origin));
}
