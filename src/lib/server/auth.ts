import "server-only";

import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

/** Çerezdeki JWT'yi Supabase'e doğrulatır (`getUser`); `getSession` sonucuna güvenilmez. İstek başına bir kez. */
export const currentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

export class AuthError extends Error {
  constructor() {
    super("Bu işlem için giriş yapmalısın.");
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError();
  return user;
}
