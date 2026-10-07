import "server-only";

import { createHash } from "node:crypto";
import { btkCertId, CERT_POINTS, credlyBadgeId, nameMatches } from "@/lib/score";
import type { CertProvider, CertStatus } from "@/lib/types";

// Sertifikayı resmi kaynaktan doğrular (kararlar.md Bölüm 6). İstek sadece sabit adreslere gider (BTK, Credly);
// kullanıcının linkinden yalnızca numara alınır, link olduğu gibi açılmaz (SSRF yok). Kaynaktan gelen metin
// güvenilmeyen veridir: sadece isim karşılaştırmasında kullanılır, hiçbir yere yazılmaz.

export type CertCheck =
  | { ok: true; status: CertStatus; points: number }
  /** Sertifika kaynakta yok, iptal edilmiş ya da kaynağa ulaşılamadı: eklenmez. */
  | { ok: false; reason: string };

const UA = "TLTpulse-sertifika-dogrulama/1.0";

class Unreachable extends Error {}

async function fetchCapped(url: string, accept: string, maxBytes: number) {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    throw new Unreachable();
  }
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Unreachable();
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Unreachable();
  return { status: res.status, type: res.headers.get("content-type") ?? "", finalUrl: res.url, buf };
}

/** Nesnedeki bütün metinler (isim alanının adı bilinmediği için hepsine bakılır). */
function strings(v: unknown, out: string[] = [], depth = 0): string[] {
  if (out.length > 2000 || depth > 6) return out;
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out, depth + 1));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out, depth + 1));
  return out;
}

async function pdfText(buf: Buffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

const allowedPdfHost = (h: string) => h === "btkakademi.gov.tr" || h.endsWith(".btkakademi.gov.tr") || h.endsWith(".akamaized.net");

/**
 * BTK Akademi doğrulama sayfası sertifikayı sunucuda hazırlayıp sayfaya JSON olarak koyuyor (__NEXT_DATA__):
 * yoksa `certificate: null`. İsim JSON'da yoksa sayfanın verdiği sertifika PDF'inde aranır.
 */
async function checkBtk(link: string, profileName: string): Promise<CertCheck> {
  const id = btkCertId(link);
  if (!id) return { ok: false, reason: "BTK Akademi doğrulama linki şöyle olmalı: btkakademi.gov.tr/portal/certificate/validate?certificateId=…" };
  const page = await fetchCapped(`https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=${encodeURIComponent(id)}`, "text/html", 3_000_000);
  if (page.status >= 500 || page.status === 429) throw new Unreachable();
  const m = page.buf.toString("utf8").match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  let props: { certificate?: unknown; url?: unknown } | undefined;
  try {
    props = m ? JSON.parse(m[1])?.props?.pageProps : undefined;
  } catch {
    props = undefined;
  }
  // Sayfanın yapısı değiştiyse kullanıcıyı suçlamayalım: "şu an doğrulanamadı".
  if (!props || !("certificate" in props)) throw new Unreachable();
  if (!props.certificate) return { ok: false, reason: "Bu numarayla BTK Akademi'de bir sertifika bulunamadı." };

  if (nameMatches(profileName, strings(props.certificate).join(" "))) return { ok: true, status: "Doğrulandı", points: CERT_POINTS.verified };
  if (typeof props.url === "string" && props.url) {
    try {
      const u = new URL(props.url, page.finalUrl || "https://www.btkakademi.gov.tr/");
      if (u.protocol === "https:" && allowedPdfHost(u.hostname.toLowerCase())) {
        const pdf = await fetchCapped(u.toString(), "application/pdf", 8_000_000);
        if (pdf.status === 200 && pdf.buf.subarray(0, 5).toString() === "%PDF-" && nameMatches(profileName, await pdfText(pdf.buf)))
          return { ok: true, status: "Doğrulandı", points: CERT_POINTS.verified };
      }
    } catch (e) {
      if (e instanceof Unreachable) throw e;
    }
  }
  return { ok: true, status: "İsim uyuşmuyor", points: 0 };
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * Credly: Open Badges kaydı (api.credly.com) rozetin var olduğunu ve kime verildiğini (e-postanın SHA-256 özeti) söylüyor.
 * E-posta tutmazsa (Credly'de başka e-posta kullanılmış olabilir) rozet sayfasındaki "… issued by … to <İsim>." başlığına bakılır.
 */
async function checkCredly(link: string, profileName: string, email: string): Promise<CertCheck> {
  const id = credlyBadgeId(link);
  if (!id) return { ok: false, reason: "Credly rozet linki şöyle olmalı: credly.com/badges/…" };
  const a = await fetchCapped(`https://api.credly.com/v1/obi/v2/badge_assertions/${id}`, "application/json", 200_000);
  if (a.status === 404) return { ok: false, reason: "Bu rozet Credly'de bulunamadı." };
  if (a.status !== 200) throw new Unreachable();
  let assertion: { revoked?: boolean; recipient?: { type?: string; identity?: string; hashed?: boolean; salt?: string } };
  try {
    assertion = JSON.parse(a.buf.toString("utf8"));
  } catch {
    throw new Unreachable();
  }
  if (assertion.revoked) return { ok: false, reason: "Bu rozet Credly'de iptal edilmiş." };

  const r = assertion.recipient;
  if (r?.type === "email" && r.identity && email) {
    const mail = email.trim().toLowerCase();
    const want = r.hashed ? `sha256$${createHash("sha256").update(mail + (r.salt ?? "")).digest("hex")}` : mail;
    if (r.identity.toLowerCase() === want) return { ok: true, status: "Doğrulandı", points: CERT_POINTS.verified };
  }

  try {
    const page = await fetchCapped(`https://www.credly.com/badges/${id}`, "text/html", 2_000_000);
    const title = page.status === 200 ? page.buf.toString("utf8").match(/<meta property="og:title" content="([^"]{1,400})"/) : null;
    const to = title ? decode(title[1]).match(/ to (.{2,120})\.\s*$/) : null;
    if (to && nameMatches(profileName, to[1])) return { ok: true, status: "Doğrulandı", points: CERT_POINTS.verified };
  } catch {
    // Rozet sayfası açılmadıysa e-posta kontrolünün sonucu geçerli.
  }
  return { ok: true, status: "İsim uyuşmuyor", points: 0 };
}

/** BTK ve Credly kaynaktan doğrulanır; diğerleri beyan (5 puan, bir kişi onaylarsa 20). */
export async function verifyCertificate(provider: CertProvider, link: string, profile: { name: string; email: string }): Promise<CertCheck> {
  try {
    if (provider === "BTK Akademi") return await checkBtk(link, profile.name);
    if (provider === "Credly") return await checkCredly(link, profile.name, profile.email);
    return { ok: true, status: "Beyan", points: CERT_POINTS.declared };
  } catch (e) {
    if (!(e instanceof Unreachable)) console.error("[sertifika]", e instanceof Error ? e.message : e);
    return { ok: false, reason: `${provider} şu an yanıt vermiyor, sertifika doğrulanamadı. Biraz sonra tekrar dene.` };
  }
}
