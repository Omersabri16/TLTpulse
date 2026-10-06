import "server-only";

import { z } from "zod";
import { FIELDS, type ActionResult, type Field } from "@/lib/types";
import { AuthError } from "./auth";

/** Kullanıcıya aynen gösterilecek hata. Diğer hatalar genel mesaja çevrilir (iç ayrıntı sızmaz). */
export class UserError extends Error {}

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof UserError || e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) {
      const m = e.issues[0]?.message ?? "";
      // Türkçe mesaj yazılmamış kurallarda zod'un İngilizce mesajı gösterilmez.
      return { ok: false, error: m && !/^(Invalid|Expected|Too|Required|Unrecognized)/.test(m) ? m : "Girdiğin bilgileri kontrol et." };
    }
    console.error("[aksiyon]", e instanceof Error ? e.message : e);
    return { ok: false, error: "Bir şeyler ters gitti. Biraz sonra tekrar dene." };
  }
}

export function check<T>(res: { data: T | null; error: { message: string; code?: string } | null }, what = "işlem"): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

// Ortak doğrulama kalıpları (guvenlik skill'i, bölüm 8).
export const text = (max: number, msg = "Metin çok uzun.") => z.string().trim().max(max, msg);
export const url = z
  .string()
  .trim()
  .max(300, "Link çok uzun.")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Link https:// ile başlamalı.");
export const FIELD = z.enum(FIELDS as [Field, ...Field[]], { error: "Geçerli bir alan seç." });
