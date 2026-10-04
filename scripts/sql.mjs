// Supabase Management API üzerinden SQL çalıştırır (HTTPS). Bazı ağlar 5432/6543'ü engellediği için bu yol kullanılıyor.
// Kullanım: node scripts/sql.mjs dosya.sql   |   node scripts/sql.mjs -e "select 1"
// Token: SUPABASE_ACCESS_TOKEN ortam değişkeni ya da ../gizli/hesaplar.md (sbp_ ile başlayan satır)
import fs from "node:fs";

export const REF = "fcgzxibzuginicotbfrb";

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const file = new URL("../../gizli/hesaplar.md", import.meta.url);
  const m = fs.existsSync(file) && fs.readFileSync(file, "utf8").match(/(sbp_[A-Za-z0-9_]+)/);
  if (!m) throw new Error("Erişim token'ı yok: SUPABASE_ACCESS_TOKEN ortam değişkeni ya da gizli/hesaplar.md");
  return m[1];
}

export async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`SQL hatası (${r.status}): ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : [];
}

export async function management(path, init = {}) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`API hatası ${path} (${r.status}): ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}

if (process.argv[1]?.endsWith("sql.mjs")) {
  const args = process.argv.slice(2);
  const q = args[0] === "-e" ? args[1] : fs.readFileSync(args[0], "utf8");
  const res = await sql(q);
  console.log(JSON.stringify(res, null, 1).slice(0, 6000));
}
