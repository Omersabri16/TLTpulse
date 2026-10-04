// Supabase kurulumu (Management API, HTTPS). Erişim token'ı: SUPABASE_ACCESS_TOKEN ya da ../gizli/hesaplar.md
//   node scripts/setup.mjs migrate   -> supabase/migrations/*.sql dosyalarını sırayla, bir kez uygular
//   node scripts/setup.mjs auth      -> giriş ayarları: Gmail SMTP, e-posta doğrulama, Türkçe şablonlar, izinli adresler
//   node scripts/setup.mjs types     -> veritabanı tiplerini src/lib/database.types.ts'e üretir
import fs from "node:fs";
import { management, sql } from "./sql.mjs";

const root = new URL("../", import.meta.url);
const env = Object.fromEntries(
  fs
    .readFileSync(new URL(".env.local", root), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

async function migrate() {
  await sql("create schema if not exists private; create table if not exists private.migrations (name text primary key, applied_at timestamptz not null default now());");
  const done = new Set((await sql("select name from private.migrations")).map((r) => r.name));
  const dir = new URL("supabase/migrations/", root);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const body = fs.readFileSync(new URL(f, dir), "utf8");
    await sql(`${body}\ninsert into private.migrations (name) values ('${f.replace(/'/g, "''")}');`);
    console.log("uygulandı:", f);
  }
  console.log("migration'lar güncel.");
}

const SITE = env.SITE_URL || "http://localhost:3000";
const button = (href, text) =>
  `<p><a href="${href}" style="display:inline-block;background:#5249d0;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:600">${text}</a></p>`;
const wrap = (body) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#16163a;max-width:520px">${body}<p style="color:#626280;font-size:13px">Bu e-postayı sen istemediysen yok sayabilirsin.<br>TLTpulse</p></div>`;

async function auth() {
  if (!env.GMAIL_ADDRESS || !env.GMAIL_APP_PASSWORD) throw new Error(".env.local'da GMAIL_ADDRESS ve GMAIL_APP_PASSWORD olmalı");
  const current = await management("/config/auth");
  const wanted = {
    site_url: SITE,
    uri_allow_list: ["http://localhost:3000/**", "http://localhost:3100/**", "https://tlt-pulse.vercel.app/**", `${SITE}/**`].filter((v, i, a) => a.indexOf(v) === i).join(","),
    mailer_autoconfirm: false,
    password_min_length: 8,
    smtp_admin_email: env.GMAIL_ADDRESS,
    smtp_host: "smtp.gmail.com",
    smtp_port: "465",
    smtp_user: env.GMAIL_ADDRESS,
    smtp_pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
    smtp_sender_name: "TLTpulse",
    mailer_subjects_confirmation: "TLTpulse hesabını doğrula",
    mailer_templates_confirmation_content: wrap(
      `<p>Merhaba,</p><p>TLTpulse hesabını açmak için e-postanı doğrula:</p>${button("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding", "E-postamı doğrula")}`,
    ),
    mailer_subjects_recovery: "TLTpulse şifre sıfırlama",
    mailer_templates_recovery_content: wrap(
      `<p>Merhaba,</p><p>Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı kısa süre geçerli.</p>${button("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery", "Yeni şifre belirle")}`,
    ),
  };
  const unknown = Object.keys(wanted).filter((k) => !(k in current));
  if (unknown.length) throw new Error(`Supabase bu ayarları tanımıyor: ${unknown.join(", ")}`);
  await management("/config/auth", { method: "PATCH", body: JSON.stringify(wanted) });
  const after = await management("/config/auth");
  console.log("giriş ayarları:", { site_url: after.site_url, mailer_autoconfirm: after.mailer_autoconfirm, smtp_host: after.smtp_host, uri_allow_list: after.uri_allow_list });
}

async function types() {
  const res = await management("/types/typescript?included_schemas=public");
  fs.writeFileSync(new URL("src/lib/database.types.ts", root), `// Otomatik üretildi: node scripts/setup.mjs types. Elle düzenleme.\n${res.types}`);
  console.log("src/lib/database.types.ts yazıldı.");
}

const cmd = process.argv[2];
const run = { migrate, auth, types }[cmd];
if (!run) {
  console.log("Kullanım: node scripts/setup.mjs migrate | auth | types");
  process.exit(1);
}
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
