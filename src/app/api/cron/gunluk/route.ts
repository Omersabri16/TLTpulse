import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDaily } from "@/lib/server/daily";

// Vercel Cron günde bir çağırır (vercel.json) ve `Authorization: Bearer ${CRON_SECRET}` başlığını kendisi ekler.
// Gizli anahtar olmadan kimse tetikleyemez.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !timingSafeEqual(digest(got), digest(`Bearer ${secret}`))) return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });
  const report = await runDaily();
  return NextResponse.json({ ok: true, report });
}
