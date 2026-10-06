import { NextResponse } from "next/server";
import { db } from "@/lib/server/admin";

// GitHub README'ye eklenen canlı rozet: lig + sezon puanı. Kimlik gerektirmez, sadece herkese açık bilgi.
// Kullanım: [![TLTpulse](https://tlt-pulse.vercel.app/rozet/kullanici)](https://tlt-pulse.vercel.app/u/kullanici)

const USERNAME = /^[a-z0-9_-]{3,30}$/;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// Verdana 11px için kaba genişlik (shields.io ile aynı yöntem).
const width = (s: string) => Math.round([...s].reduce((a, c) => a + (/[ilj.,:;'|!]/.test(c) ? 3.5 : /[mwMW]/.test(c) ? 9.5 : /[A-ZÇĞİÖŞÜ0-9]/.test(c) ? 7.5 : 6.5), 0)) + 12;

function svg(left: string, right: string, color: string) {
  const lw = width(left);
  const rw = width(right);
  const w = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(left)}: ${esc(right)}">
<title>${esc(left)}: ${esc(right)}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#16165c"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><rect width="${w}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${esc(left)}</text><text x="${lw + rw / 2}" y="14">${esc(right)}</text></g></svg>`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ kullanici: string }> }) {
  const { kullanici } = await ctx.params;
  const headers = { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600", "X-Content-Type-Options": "nosniff" };
  if (!USERNAME.test(kullanici)) return new NextResponse(svg("TLTpulse", "bulunamadı", "#9a9ab0"), { status: 404, headers });
  const r = await db().from("profiles").select("league, season_points, suspended").eq("username", kullanici).maybeSingle();
  const p = r.data as { league: string; season_points: number; suspended: boolean } | null;
  if (!p || p.suspended) return new NextResponse(svg("TLTpulse", "bulunamadı", "#9a9ab0"), { status: 404, headers });
  const color = p.league === "Kıdemli" ? "#5249d0" : p.league === "Orta" ? "#1aa7ec" : "#2f9e6e";
  return new NextResponse(svg("TLTpulse", `${p.league} lig · ${p.season_points} puan`, color), { headers });
}
