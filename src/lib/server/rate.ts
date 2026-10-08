import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
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

/**
 * Giriş yapmamış istekler için (giriş, kayıt, şifre sıfırlama): anahtar e-posta ya da IP'nin özeti (düz hali saklanmaz).
 * Supabase'in kendi sınırı Vercel'in IP'sine uygulandığı için kullanıcı başına sınır burada.
 */
export async function allowKey(key: string, action: string, limit: number, windowMinutes: number) {
  const k = createHash("sha256").update(`${action}:${key.toLowerCase()}`).digest("hex").slice(0, 40);
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await db().from("rate_events").select("id", { count: "exact", head: true }).eq("key", k).eq("action", action).gte("created_at", since);
  if (error) throw new Error("hız sınırı okunamadı");
  if ((count ?? 0) >= limit) return false;
  await db().from("rate_events").insert({ key: k, action });
  return true;
}

/** allowKey'in son kaydını geri alır (iş hiç başlamadıysa hak düşmesin). */
export async function refundKey(key: string, action: string) {
  const k = createHash("sha256").update(`${action}:${key.toLowerCase()}`).digest("hex").slice(0, 40);
  const last = (await db().from("rate_events").select("id").eq("key", k).eq("action", action).order("created_at", { ascending: false }).limit(1).maybeSingle()).data as { id: number } | null;
  if (last) await db().from("rate_events").delete().eq("id", last.id);
}

/** İsteğin IP'si (Vercel x-forwarded-for'un ilk değerini kendisi yazar). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "yerel").trim().slice(0, 64);
}
