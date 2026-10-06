import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/admin";
import { applyRun } from "@/lib/server/competition-flow";
import { consumeNonce, verifySignature } from "@/lib/server/evaluation";

// Özel değerlendirme reposundaki GitHub Actions sonucu buraya yazar. Güvenlik:
// 1) HMAC-SHA256 imza (ortak gizli anahtar, zaman damgalı), 2) tek kullanımlık nonce (tekrar gönderim reddedilir),
// 3) gövde şeması ve boyut sınırı. Sadece testlerin ve ölçümlerin ham sonucu gelir; puanı sunucu hesaplar.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Test = z.object({ id: z.string().max(20), title: z.string().max(200), public: z.boolean(), passed: z.boolean() });
const TeamRes = z.object({
  team_id: z.string().regex(/^t-[A-Za-z0-9-]{2,40}$/),
  reachable: z.boolean(),
  tests: z.array(Test).max(80),
  lighthouse: z.object({ accessibility: z.number().min(0).max(1), performance: z.number().min(0).max(1), mobile: z.number().min(0).max(1) }).nullable().optional(),
  lint_errors: z.number().int().min(0).max(100000).nullable().optional(),
  audit_high: z.number().int().min(0).max(10000).nullable().optional(),
});
const Body = z.object({
  nonce: z.string().min(20).max(100),
  kind: z.enum(["degerlendirme", "acik", "dogrulama"]),
  competition_id: z.string().regex(/^y-[0-9]{2,4}$/),
  teams: z.array(TeamRes).max(200).optional(),
  validation: z.object({ sample_passed: z.number().int().min(0), sample_total: z.number().int().min(0), blank_passed: z.number().int().min(0) }).optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 500_000) return NextResponse.json({ hata: "çok büyük" }, { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-tlt-zaman"), req.headers.get("x-tlt-imza"))) return NextResponse.json({ hata: "imza geçersiz" }, { status: 401 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ hata: "geçersiz gövde" }, { status: 400 });
  }
  const run = await consumeNonce(body.nonce, body.competition_id);
  if (!run || run.kind !== body.kind) return NextResponse.json({ hata: "istek bulunamadı ya da daha önce kullanıldı" }, { status: 409 });
  try {
    await applyRun(body.kind, body.competition_id, run.team_id, body);
  } catch (e) {
    console.error("[değerlendirme]", e instanceof Error ? e.message : e);
    // İşlenemeyen sonuç tekrar gönderilebilsin (iş akışı yeniden dener).
    await db().from("evaluation_runs").update({ status: "Bekliyor", finished_at: null }).eq("id", run.id);
    return NextResponse.json({ hata: "işlenemedi" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
