import "server-only";

import { db } from "./admin";

/** Ücretsiz hız sınırı: Postgres'te sayaç. Sınır aşılırsa false döner, aşılmazsa olayı kaydeder. */
export async function allow(userId: string, action: string, limit: number, windowHours: number) {
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const { count, error } = await db().from("rate_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("action", action).gte("created_at", since);
  if (error) throw new Error("hız sınırı okunamadı");
  if ((count ?? 0) >= limit) return false;
  await db().from("rate_events").insert({ user_id: userId, action });
  return true;
}
