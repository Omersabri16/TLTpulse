import "server-only";

import { db } from "./admin";

/** İki kişiden biri diğerini engellediyse true (mesaj ve bağlantı yasak). */
export async function blockedBetween(a: string, b: string) {
  const r = await db()
    .from("blocks")
    .select("user_id", { count: "exact", head: true })
    .or(`and(user_id.eq.${a},blocked_id.eq.${b}),and(user_id.eq.${b},blocked_id.eq.${a})`);
  return (r.count ?? 0) > 0;
}
