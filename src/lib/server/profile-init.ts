import "server-only";

import { randomBytes, randomInt } from "node:crypto";
import { db } from "./admin";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (n: number) => Array.from(randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join("");

/** CV doğrulama kodu: tahmin edilemez, 10 karakter. */
export const newCvCode = () => `TLT-${randomCode(10)}`;
/** GitHub bio'suna yazılacak kod. */
export const newGithubCode = () => `tltpulse-${randomCode(6).toLowerCase()}`;

export const slugify = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);

/** Kullanıcının profil satırı yoksa oluşturur (kayıt ve e-posta doğrulama sonrası). */
export async function ensureProfile(userId: string, name: string) {
  const existing = await db().from("profiles").select("username").eq("id", userId).maybeSingle();
  if (existing.data) return (existing.data as { username: string }).username;

  let base = slugify(name);
  if (base.length < 3) base = `yazilimci${base}`;
  for (let i = 0; i < 8; i++) {
    const username = i === 0 ? base : `${base}${randomInt(10, 9999)}`;
    const { error } = await db()
      .from("profiles")
      .insert({ id: userId, username, name: name.trim().slice(0, 80), cv_code: newCvCode(), github_code: newGithubCode() });
    if (!error) {
      await db().from("notifications").insert({ user_id: userId, text: "TLTpulse'a hoş geldin! İlk projeni ekleyerek başla.", href: "/projeler" });
      return username;
    }
    if (error.code !== "23505") throw new Error(`profil oluşturulamadı: ${error.message}`);
    if (error.message.includes("profiles_pkey")) return ensureProfile(userId, name);
  }
  throw new Error("kullanıcı adı üretilemedi");
}
