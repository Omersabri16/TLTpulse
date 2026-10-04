import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let admin: SupabaseClient<any> | undefined;

/**
 * Secret key'li istemci: RLS'i aşar. Sadece kullanıcı `requireUser()` ile doğrulandıktan ve
 * yetki kontrolü yapıldıktan sonra kullanılır. Asla istemciye dönmez.
 */
export function db() {
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
