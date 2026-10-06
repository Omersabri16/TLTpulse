import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { shareInfo } from "@/lib/server/share";

// Lig atlayanın sosyal medyada paylaşacağı görsel (kararlar.md Bölüm 5, "Sezonlu lig"). Kimlik istemez; sadece herkese
// açık bilgi (ad, lig, sezon sonucu). Biçimler: kare (Instagram gönderisi), hikaye (Instagram / X hikaye), yatay (X, LinkedIn).
// Profil sayfasının og:image'ı da bu (yatay): X'te paylaşılan profil linki bu kartla görünür.

const SIZES = { kare: [1080, 1080], hikaye: [1080, 1920], yatay: [1200, 630] } as const;
type Format = keyof typeof SIZES;

const NAVY = "#16165c";
const NAVY_LINE = "#2c2c84";
const CYAN = "#1aa7ec";
const LAV = "#cfcdfb";

function Pulse({ w, color }: { w: number; color: string }) {
  // Markanın nabız çizgisi (components/brand.tsx PulseLine'ın sade hali).
  const m = 60;
  const d = `M0 ${m} L${w * 0.38} ${m} L${w * 0.42} ${m - 18} L${w * 0.45} ${m + 22} L${w * 0.49} ${m - 52} L${w * 0.53} ${m + 30} L${w * 0.56} ${m} L${w} ${m}`;
  return (
    <svg width={w} height={120} viewBox={`0 0 ${w} 120`}>
      <path d={d} stroke={color} strokeWidth={6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ kullanici: string }> }) {
  const { kullanici } = await ctx.params;
  const info = await shareInfo(kullanici);
  if (!info) return new Response("Bulunamadı", { status: 404 });
  const f = (new URL(req.url).searchParams.get("bicim") ?? "yatay") as Format;
  const [width, height] = SIZES[f] ?? SIZES.yatay;
  const tall = height > width;
  const scale = width / 1200;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/logo-mark.png"))).toString("base64")}`;
  const site = (process.env.SITE_URL ?? "https://tlt-pulse.vercel.app").replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "space-between", background: NAVY, color: "white", padding: 80 * scale }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 * scale }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={64 * scale} height={64 * scale} alt="" style={{ borderRadius: 14 * scale }} />
          <span style={{ fontSize: 40 * scale, letterSpacing: -1 }}>TLTpulse</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: (tall ? 36 : 18) * scale }}>
          <span style={{ fontSize: (tall ? 46 : 34) * scale, color: LAV }}>{info.name}</span>
          <span style={{ fontSize: (tall ? 132 : 92) * scale, lineHeight: 1.02, letterSpacing: -3, color: info.achieved ? CYAN : "white" }}>{info.headline}</span>
          <span style={{ fontSize: (tall ? 44 : 32) * scale, color: LAV }}>
            {info.sub}
            {info.field ? ` · ${info.field}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 * scale }}>
          <Pulse w={width - 160 * scale} color={NAVY_LINE} />
          <span style={{ fontSize: 30 * scale, color: LAV }}>Kanıta dayalı yazılımcı ligi · {site}/u/{kullanici}</span>
        </div>
      </div>
    ),
    { width, height, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}
