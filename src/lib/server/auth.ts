import "server-only";

import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { db } from "./admin";

/** Çerezdeki JWT'yi Supabase'e doğrulatır (`getUser`); `getSession` sonucuna güvenilmez. İstek başına bir kez. */
export const currentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

const flags = cache(async (id: string) => {
  const r = await db().from("profiles").select("is_admin, suspended").eq("id", id).maybeSingle();
  return (r.data as { is_admin: boolean; suspended: boolean } | null) ?? { is_admin: false, suspended: false };
});

export class AuthError extends Error {
  constructor(message = "Bu işlem için giriş yapmalısın.") {
    super(message);
  }
}

/** Giriş yapmış ve askıya alınmamış kullanıcı. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError();
  if ((await flags(user.id)).suspended) throw new AuthError("Hesabın kötüye kullanım nedeniyle askıya alındı. tltpulse16@gmail.com adresine yazabilirsin.");
  return user;
}

/** Yönetici: rol veritabanında, sadece SQL ile verilir (scripts/setup.mjs admin). Her yönetici aksiyonu bununla başlar. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!(await flags(user.id)).is_admin) throw new AuthError("Bu işlem sadece yöneticiler içindir.");
  return user;
}

export async function isAdmin() {
  const user = await currentUser();
  return !!user && (await flags(user.id)).is_admin;
}
