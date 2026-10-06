// Tek seferlik düzeltmeler (6 Ekim 2026). Önce deneme gösterir, `--yaz` ile yazar.
//   node scripts/tek-seferlik.mts admin <e-posta> [--yaz]  -> kullanıcıyı yönetici yapar (Management API token'ı gerekmez, secret key yeter)
//   node scripts/tek-seferlik.mts ice-aktarilmis [--yaz]    -> içe aktarılmış kod cezası kalkan Kolay/Orta projelerin puanını yeniden hesaplar
// Kullanıcının lig puanı, profil sayfası bir sonraki açılışta (loadMe → syncScore) defterle eşitlenir.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { importPenalized, projectPoints } from "../src/lib/score.ts";
import type { ProjectAnalysis } from "../src/lib/types.ts";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const [cmd, arg] = process.argv.slice(2).filter((a) => a !== "--yaz");
const APPLY = process.argv.includes("--yaz");

async function admin(email = "") {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Kullanım: node scripts/tek-seferlik.mts admin <e-posta> [--yaz]");
  let user: { id: string } | undefined;
  for (let page = 1; ; page++) {
    const r = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (r.error) throw r.error;
    user = r.data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || r.data.users.length < 1000) break;
  }
  if (!user) return console.log("Bu e-postayla kayıtlı kullanıcı yok:", email);
  const p = await sb.from("profiles").select("username, is_admin").eq("id", user.id).single();
  if (p.error) throw p.error;
  console.log("Profil:", p.data);
  if (p.data.is_admin) return console.log("Zaten yönetici.");
  if (!APPLY) return console.log("Deneme. Yönetici yapmak için sonuna --yaz ekle.");
  const u = await sb.from("profiles").update({ is_admin: true }).eq("id", user.id).select("username, is_admin").single();
  if (u.error) throw u.error;
  console.log("Yönetici yapıldı:", u.data);
}

type Row = { id: string; name: string; points: number; status: string; analysis: ProjectAnalysis | null };

async function iceAktarilmis() {
  const pr = await sb.from("projects").select("id, name, points, status, analysis");
  if (pr.error) throw pr.error;
  let n = 0;
  for (const x of pr.data as Row[]) {
    const a = x.analysis;
    if (!a || x.status !== "hazır" || !(a.importedRatio > 0.6) || importPenalized(a.difficulty, a.importedRatio)) continue;
    const pts = projectPoints({ difficulty: a.difficulty, ci: !!a.checks?.tests, demo: !!a.checks?.demo, readme: !!a.checks?.readme, commitDays: a.commitDays ?? 0, importedRatio: a.importedRatio });
    const summary = String(a.summary ?? "").replace(/ Kodun %\d+'i ilk commit'le gelmiş, puan sonradan yazılan kısmın oranıyla çarpıldı\./, "");
    if (pts === x.points && summary === a.summary) continue;
    n++;
    console.log(`${x.name}: ${a.difficulty}, ilk commit'le gelen %${Math.round(a.importedRatio * 100)}, puan ${x.points} → ${pts}`);
    if (APPLY) {
      const u = await sb.from("projects").update({ points: pts, analysis: { ...a, points: pts, summary } }).eq("id", x.id);
      if (u.error) throw u.error;
    }
  }
  console.log(n ? (APPLY ? `${n} proje güncellendi.` : `${n} proje değişecek. Yazmak için sonuna --yaz ekle.`) : "Değişecek proje yok.");
}

if (cmd === "admin") await admin(arg);
else if (cmd === "ice-aktarilmis") await iceAktarilmis();
else console.log("Kullanım: node scripts/tek-seferlik.mts admin <e-posta> | ice-aktarilmis   [--yaz]");
