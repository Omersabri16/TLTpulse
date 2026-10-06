import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev modunda aksiyon argümanları (şifreler dahil) terminale yazılmasın.
  logging: { serverFunctions: false },
  // CV yükleme (en fazla 4 MB; Vercel'in istek sınırı 4.5 MB). Dosya saklanmaz, sadece metni çıkarılır.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  serverExternalPackages: ["unpdf"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Onay linkindeki token dış sitelere Referer ile sızmasın, arama motoru indekslemesin.
      {
        source: "/onay/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
