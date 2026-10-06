import "server-only";

import dns from "node:dns";
import https from "node:https";
import net from "node:net";

// Kullanıcının verdiği linke (demo) sunucudan istek: SSRF koruması (guvenlik skill'i, bölüm 7).
// Sadece https ve 443; adres bağlantı anında çözülüp kontrol edilir (DNS rebinding ile iç ağa gidilemez);
// özel/yerel IP'ler engelli; 5 sn zaman aşımı; en fazla 3 yönlendirme, her biri yeniden kontrol edilir.

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("64:ff9b");
}

const safeLookup: typeof dns.lookup = ((host: string, opts: dns.LookupOptions, cb: (e: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void) => {
  dns.lookup(host, { ...opts, all: true }, (err, addresses) => {
    if (err) return cb(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) return cb(Object.assign(new Error("engelli adres"), { code: "EBLOCKED" }), "", 4);
    if (opts.all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}) as typeof dns.lookup;

function checkUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, "")) && isPrivateIp(u.hostname.replace(/^\[|\]$/g, ""))) return null;
  return u;
}

function head(u: URL): Promise<{ status: number; location?: string }> {
  return new Promise((resolve) => {
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: "GET", lookup: safeLookup, timeout: 5000, headers: { "User-Agent": "TLTpulse-demo-kontrol/1.0", Accept: "text/html,*/*" } },
      (res) => {
        resolve({ status: res.statusCode ?? 0, location: res.headers.location });
        res.destroy();
      },
    );
    req.on("timeout", () => req.destroy(new Error("zaman aşımı")));
    req.on("error", () => resolve({ status: 0 }));
    req.end();
  });
}

/** Demo linki açılıyor mu (2xx/3xx)? */
export async function urlOpens(raw: string): Promise<boolean> {
  let u = checkUrl(raw);
  for (let hop = 0; u && hop < 4; hop++) {
    const r = await head(u);
    if (r.status >= 200 && r.status < 300) return true;
    if (r.status >= 300 && r.status < 400 && r.location) {
      if (hop === 3) return true;
      u = checkUrl(new URL(r.location, u).toString());
      continue;
    }
    return false;
  }
  return false;
}
