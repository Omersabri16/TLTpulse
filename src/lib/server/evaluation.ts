import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./admin";

// Değerlendirme hattı (kararlar.md Bölüm 5, "Yarışma değerlendirmesi"): gizli testler özel GitHub reposunda.
// Sunucu oradaki iş akışını workflow_dispatch ile tetikler; Actions testleri takımların demolarına karşı çalıştırıp sonucu
// /api/degerlendirme'ye HMAC imzalı istekle geri yazar. Her istek tek kullanımlık bir nonce taşır (tekrar gönderime karşı).
//
// Ortam değişkenleri: EVAL_REPO (sahip/repo), EVAL_GITHUB_TOKEN (sadece o repoda actions:write + contents:write),
// EVAL_SECRET (Actions secret'ıyla aynı, en az 32 karakter), SITE_URL.

export const evalConfigured = () => !!(process.env.EVAL_REPO && process.env.EVAL_GITHUB_TOKEN && process.env.EVAL_SECRET && process.env.EVAL_SECRET.length >= 32);

export type RunKind = "degerlendirme" | "acik" | "dogrulama";

export const nonceHash = (n: string) => createHash("sha256").update(n).digest("hex");

export class EvalError extends Error {}

function evalHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "tltpulse",
    Authorization: `Bearer ${process.env.EVAL_GITHUB_TOKEN}`,
  };
}

/** İş akışını tetikler. Girdi tek bir JSON metni (workflow_dispatch en fazla 10 girdi alıyor). */
export async function dispatchRun(kind: RunKind, competitionId: string, payload: Record<string, unknown>, teamId?: string) {
  if (!evalConfigured()) throw new EvalError("Değerlendirme reposu ayarlı değil (EVAL_REPO, EVAL_GITHUB_TOKEN, EVAL_SECRET).");
  const nonce = randomBytes(24).toString("base64url");
  const ins = await db()
    .from("evaluation_runs")
    .insert({ competition_id: competitionId, kind, team_id: teamId ?? null, nonce_hash: nonceHash(nonce) })
    .select("id")
    .single();
  if (ins.error) throw new Error(`değerlendirme kaydı: ${ins.error.message}`);
  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const istek = JSON.stringify({ ...payload, kind, competition_id: competitionId, nonce, callback: `${site}/api/degerlendirme` });
  if (istek.length > 60_000) throw new EvalError("Değerlendirme isteği çok büyük.");
  const r = await fetch(`https://api.github.com/repos/${process.env.EVAL_REPO}/actions/workflows/degerlendir.yml/dispatches`, {
    method: "POST",
    headers: { ...evalHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { istek } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (r.status !== 204) {
    await db().from("evaluation_runs").delete().eq("id", (ins.data as { id: string }).id);
    console.error("[değerlendirme] dispatch", r.status, (await r.text()).slice(0, 300));
    throw new EvalError("Değerlendirme iş akışı başlatılamadı. Repo, token ve iş akışı dosyasını kontrol et.");
  }
  return (ins.data as { id: string }).id;
}

/** Gelen sonucun imzası: HMAC-SHA256(`${zaman}.${gövde}`), sabit zamanlı karşılaştırma; 6 saatten eski istek reddedilir. */
export function verifySignature(body: string, ts: string | null, sig: string | null) {
  const secret = process.env.EVAL_SECRET;
  if (!secret || secret.length < 32 || !ts || !sig || !/^\d{10}$/.test(ts)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 6 * 3600) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  const got = sig.replace(/^sha256=/, "");
  if (!/^[0-9a-f]{64}$/.test(got)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(got, "hex"));
}

/** Nonce'u bir kez tüketir: "Bekliyor" ise "Tamam" yapar ve kaydı döner; değilse null. */
export async function consumeNonce(nonce: string, competitionId: string) {
  const r = await db()
    .from("evaluation_runs")
    .update({ status: "Tamam", finished_at: new Date().toISOString() })
    .eq("nonce_hash", nonceHash(nonce))
    .eq("competition_id", competitionId)
    .eq("status", "Bekliyor")
    .select("id, kind, team_id");
  return ((r.data ?? []) as { id: string; kind: RunKind; team_id: string | null }[])[0] ?? null;
}

/** Testleri özel repoya yazar (yönetici "Testleri üret" sonrası onaylayınca). */
export async function pushTestFile(path: string, content: string, message: string) {
  if (!evalConfigured()) throw new EvalError("Değerlendirme reposu ayarlı değil.");
  if (!/^sartnameler\/[a-z0-9-]{3,40}\/(acik|gizli)\.spec\.ts$/.test(path)) throw new EvalError("Geçersiz dosya yolu.");
  const base = `https://api.github.com/repos/${process.env.EVAL_REPO}/contents/${path}`;
  const cur = await fetch(base, { headers: evalHeaders(), cache: "no-store" });
  const sha = cur.ok ? ((await cur.json()) as { sha: string }).sha : undefined;
  const r = await fetch(base, {
    method: "PUT",
    headers: { ...evalHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: Buffer.from(content, "utf8").toString("base64"), sha }),
  });
  if (!r.ok) throw new EvalError("Testler özel repoya yazılamadı.");
}
