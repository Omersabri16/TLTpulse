// Uçtan uca test: dev sunucusu açıkken (varsayılan :3100) `node scripts/e2e.mjs`. Geçici bir test kullanıcısı açıp siler; ekip Gmail adresine bir onay e-postası gönderir.
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE ?? "http://localhost:3100";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Aksiyon kimlikleri
const actions = {};
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name === "server-reference-manifest.json") {
      const m = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const [id, v] of Object.entries(m.node ?? {})) {
        const page = "/" + Object.keys(v.workers)[0].replace(/^app\//, "").replace(/\/?page$/, "");
        actions[v.exportedName] ??= { id, page: page === "/" ? "/" : page.replace(/\[.*?\]/g, "x") };
      }
    }
  }
}
walk(".next/dev/server/app");

let cookies = {};
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");

async function call(name, ...args) {
  const a = actions[name];
  if (!a) throw new Error(`aksiyon yok: ${name}`);
  const r = await fetch(BASE + a.page, {
    method: "POST",
    headers: { "Next-Action": a.id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component", Origin: BASE, Cookie: cookieHeader() },
    body: JSON.stringify(args),
    redirect: "manual",
  });
  for (const c of r.headers.getSetCookie()) {
    const [kv] = c.split(";");
    const [k, ...v] = kv.split("=");
    const val = v.join("=");
    if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) || val === "") delete cookies[k];
    else cookies[k] = val;
  }
  if (r.status === 307 && (r.headers.get("location") ?? "").startsWith("/giris")) return { ok: false, error: "giriş yapmalısın (proxy yönlendirdi)" };
  const text = await r.text();
  for (const l of text.split("\n")) {
    const i = l.indexOf(":");
    if (i < 0) continue;
    try {
      const v = JSON.parse(l.slice(i + 1));
      if (v && typeof v === "object" && "ok" in v) return v;
    } catch {}
  }
  throw new Error(`${name}: beklenmeyen cevap ${r.status} ${text.slice(0, 300)}`);
}

let pass = 0,
  fail = 0;
function expect(label, cond, extra = "") {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? "  — " + extra : ""}`);
}

const TEST_EMAIL = "testbot@demo.example.com";
const TEST_PW = randomBytes(12).toString("base64url");

async function main() {
  console.log("aksiyonlar:", Object.keys(actions).length);

  // Hazırlık: temiz test kullanıcısı
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of list.data.users.filter((u) => u.email === TEST_EMAIL)) await admin.auth.admin.deleteUser(u.id);
  const created = await admin.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PW, email_confirm: true, user_metadata: { name: "Test Bot" } });
  const uid = created.data.user.id;

  // --- Yetkisiz çağrılar ---
  let r = await call("saveProfile", { about: "x" });
  expect("girişsiz profil kaydı reddedilir", !r.ok && /giriş/i.test(r.error), r.error);
  r = await call("login", { email: TEST_EMAIL, password: "yanlis-sifre" });
  expect("yanlış şifre reddedilir", !r.ok && /yanlış/i.test(r.error), r.error);

  // --- Giriş ---
  r = await call("login", { email: TEST_EMAIL, password: TEST_PW });
  expect("giriş", r.ok && r.data.session?.username, r.ok ? r.data.session.username : r.error);
  expect("oturum çerezi yazıldı", Object.keys(cookies).some((k) => k.includes("auth-token")));
  const page = await fetch(BASE + "/profil", { headers: { Cookie: cookieHeader() }, redirect: "manual" });
  expect("korumalı sayfa açılır", page.status === 200, String(page.status));
  // Korumalı sayfaları oturumla derlet ki aksiyon kimlikleri manifest'e girsin.
  for (const p of ["/yarismalar/y-07", "/takim/t-kontrast", "/mesajlar", "/yol-haritasi", "/projeler", "/puan", "/onboarding"]) await fetch(BASE + p, { headers: { Cookie: cookieHeader() } });
  walk(".next/dev/server/app");

  // --- Profil ---
  r = await call("saveProfile", {
    name: "Test Bot",
    headline: "Backend geliştirici",
    field: "Backend",
    school: "Test Üniversitesi",
    department: "Bilgisayar",
    city: "İstanbul",
    github: "https://github.com/sindresorhus",
    about: "Test amaçlı bir hesap. Node.js ve TypeScript ile küçük kütüphaneler yazıyorum, açık kaynağı seviyorum.",
    interests: ["Açık kaynak"],
    skills: ["Node.js", "TypeScript", "JavaScript", "Kubernetes"],
    education: [{ school: "Test Üniversitesi", department: "Bilgisayar", start: "", end: "" }],
  });
  expect("profil kaydı", r.ok && r.data.profile.github === "sindresorhus" && !r.data.profile.githubVerified, r.ok ? r.data.profile.githubCode : r.error);
  r = await call("saveProfile", { name: "<script>alert(1)</script>".repeat(10) });
  expect("uzun/zararlı ad reddedilir", !r.ok, r.error);
  r = await call("saveProfile", { field: "Hacker" });
  expect("geçersiz alan reddedilir", !r.ok, r.error);

  r = await call("verifyGithub");
  expect("bio'da kod yoksa GitHub doğrulanmaz", !r.ok && /bio/i.test(r.error), r.error);
  r = await call("previewProject", { repoUrl: "https://github.com/sindresorhus/is-plain-obj", name: "x", description: "en az on beş karakterlik açıklama", techs: ["JavaScript"], role: "Tek başıma" });
  expect("doğrulanmamış GitHub ile proje eklenemez", !r.ok && /doğrula/i.test(r.error), r.error);

  // Doğrulanmış gibi işaretle (bio'yu değiştiremediğimiz için).
  await admin.from("profiles").update({ github_verified: true }).eq("id", uid);

  r = await call("previewProject", { repoUrl: "https://github.com/sindresorhus/is-plain-obj", name: "is-plain-obj", description: "Bir değerin düz nesne olup olmadığını kontrol eder.", techs: ["JavaScript"], role: "Tek başıma" });
  expect("gerçek GitHub analizi", r.ok && r.data.ok, r.ok ? JSON.stringify(r.data.ok ? { ...r.data.analysis, summary: undefined } : r.data) : r.error);
  r = await call("previewProject", { repoUrl: "https://github.com/vercel/next.js", name: "next", description: "başkasının reposu, yazarlık düşük olmalı", techs: ["TypeScript"], role: "Takımla" });
  expect("başkasının reposu yazarlıkla reddedilir", r.ok && !r.data.ok, r.ok ? r.data.reason : r.error);
  r = await call("previewProject", { repoUrl: "https://evil.com/a/b", name: "x", description: "en az on beş karakterlik açıklama", techs: ["JavaScript"], role: "Tek başıma" });
  expect("GitHub dışı link reddedilir (SSRF)", !r.ok, r.error);

  r = await call("addProject", { repoUrl: "https://github.com/sindresorhus/is-plain-obj", name: "is-plain-obj", description: "Bir değerin düz nesne olup olmadığını kontrol eder.", techs: ["JavaScript"], role: "Tek başıma", demoUrl: "javascript:alert(1)" });
  expect("javascript: demo linki reddedilir", !r.ok, r.error);
  r = await call("addProject", { repoUrl: "https://github.com/sindresorhus/is-plain-obj", name: "is-plain-obj", description: "Bir değerin düz nesne olup olmadığını kontrol eder.", techs: ["JavaScript"], role: "Tek başıma" });
  expect("proje eklendi, puan sunucuda", r.ok && r.data.points > 0 && r.data.me.score.total === r.data.points, r.ok ? `+${r.data.points}, toplam ${r.data.me.score.total}` : r.error);
  expect("teknoloji 'Kod' kanıtlı beceri oldu", r.ok && r.data.me.profile.skills.find((s) => s.name === "JavaScript")?.proof === "Kod");
  r = await call("addProject", { repoUrl: "https://github.com/sindresorhus/is-plain-obj", name: "tekrar", description: "aynı repo ikinci kez eklenmemeli", techs: ["JavaScript"], role: "Tek başıma" });
  expect("aynı proje iki kez eklenemez", !r.ok, r.error);

  // --- Sertifika ---
  r = await call("addCertificate", { name: "SQL", provider: "BTK Akademi", link: "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=AB12", nameOnCert: "Test Bot" });
  expect("BTK sertifikası doğrulandı +4", r.ok && r.data.points === 4, r.ok ? String(r.data.points) : r.error);
  r = await call("addCertificate", { name: "Sahte", provider: "BTK Akademi", link: "https://btkakademi.gov.tr.evil.com/x", nameOnCert: "Test Bot" });
  expect("sahte alan adı doğrulanmaz", r.ok && r.data.points === 1, r.ok ? String(r.data.points) : r.error);

  // --- Onay ---
  const me = (await call("refreshMe")).data;
  const exp = (await admin.from("experiences").insert({ user_id: uid, kind: "Staj", title: "Backend stajyeri", org: "Test A.Ş.", start_label: "Haz 2025", end_label: "Ağu 2025" }).select("id").single()).data;
  r = await call("requestApproval", { target: { type: "experience", id: exp.id }, approverName: "Test Onaylayıcı", approverEmail: TEST_EMAIL, relation: "Staj amiri" });
  expect("kendi e-postanla onay istenemez", !r.ok, r.error);
  r = await call("requestApproval", { target: { type: "experience", id: "00000000-0000-0000-0000-000000000000" }, approverName: "X Y", approverEmail: "x@firma.com", relation: "Hoca" });
  expect("başkasının deneyimi için onay istenemez", !r.ok, r.error);
  r = await call("requestApproval", { target: { type: "experience", id: exp.id }, approverName: "TLTpulse Ekip", approverEmail: env.GMAIL_ADDRESS, relation: "Staj amiri" });
  expect("gerçek onay e-postası gönderildi (ekip Gmail'ine)", r.ok, r.ok ? "" : r.error);
  const pending = r.ok ? r.data.references.find((x) => x.status === "Bekliyor") : null;
  expect("istek sahibine link/token gösterilmiyor", pending && !JSON.stringify(r.data).match(/token_hash|\/onay\//));

  // Token'ı biz üretip satıra yazalım (e-postayı okuyamadığımız için), sonra onaylayıcı gibi yanıtlayalım.
  const token = randomBytes(32).toString("base64url");
  await admin.from("approvals").update({ token_hash: createHash("sha256").update(token).digest("hex") }).eq("id", pending.token);
  const onay = await fetch(`${BASE}/onay/${token}`);
  const onayText = await onay.text();
  expect("onay sayfası hesapsız açılır", onay.status === 200 && onayText.includes("onay istiyor"));
  expect("onay sayfası e-postanın tamamını göstermiyor", !onayText.includes(env.GMAIL_ADDRESS));
  const saved = { ...cookies };
  cookies = {};
  r = await call("answerApproval", { token, approve: true, comment: "Çok iyi çalıştı." });
  expect("onay verildi (girişsiz)", r.ok && r.data.approved, r.ok ? "" : r.error);
  r = await call("answerApproval", { token, approve: false });
  expect("aynı link ikinci kez kullanılamaz", !r.ok, r.error);
  r = await call("answerApproval", { token: "a".repeat(43), approve: true });
  expect("rastgele token reddedilir", !r.ok, r.error);
  cookies = saved;
  const after = (await call("refreshMe")).data;
  expect("onay puanı eklendi (kişisel e-posta 2 + yorum 1)", after.score.total - me.score.total === 3, `${me.score.total} → ${after.score.total}`);

  // --- Yarışma ---
  r = await call("applyCompetition", { competitionId: "y-07", field: "Backend", note: "test" });
  expect("açık yarışmaya başvuru", r.ok && r.data.applications["y-07"] === "Backend", r.ok ? "" : r.error);
  r = await call("applyCompetition", { competitionId: "y-05", field: "Backend" });
  expect("biten yarışmaya başvurulamaz", !r.ok, r.error);
  r = await call("applyCompetition", { competitionId: "y-07", field: "Mobil" });
  expect("olmayan pozisyona başvurulamaz", !r.ok, r.error);
  r = await call("withdrawCompetition", "y-07");
  expect("başvuru geri çekildi", r.ok && !r.data.applications["y-07"], r.ok ? "" : r.error);
  r = await call("submitTeamRepo", { teamId: "t-kontrast", repoUrl: "https://github.com/a/b" });
  expect("üyesi olmadığın takıma teslim yapılamaz", !r.ok, r.error);
  r = await call("sendTeamMessage", { teamId: "t-kontrast", text: "sızma denemesi" });
  expect("üyesi olmadığın takıma mesaj yazılamaz", !r.ok, r.error);
  r = await call("ratePeers", { teamId: "t-durak", ratings: { selinaksoy: 1 } });
  expect("başka takımın üyesini puanlayamazsın", !r.ok, r.error);

  // --- Mesajlar ---
  r = await call("startConversation", "denizkaya");
  expect("sohbet açıldı", r.ok && r.data.id, r.ok ? "" : r.error);
  const convId = r.data.id;
  r = await call("sendMessage", { conversationId: convId, text: "Merhaba Deniz, test mesajı." });
  expect("mesaj gönderildi", r.ok, r.ok ? "" : r.error);
  const other = await admin.from("conversations").select("id").neq("id", convId).limit(1).single();
  r = await call("sendMessage", { conversationId: other.data.id, text: "başkasının sohbetine" });
  expect("başkasının sohbetine mesaj yazılamaz", !r.ok, r.error);
  r = await call("startConversation", "testbot");
  expect("kendinle sohbet açılamaz", !r.ok, r.error);

  // --- Yol haritası ---
  r = await call("createRoadmap", "Backend");
  expect("yol haritası oluştu", r.ok && r.data.me.roadmap?.steps.length >= 3, r.ok ? `ai=${r.data.ai}, ${r.data.me.roadmap.steps.length} adım` : r.error);

  // --- Tarayıcı tarafı (RLS) ---
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  let q = await anon.from("profiles").select("*").limit(1);
  expect("anonim profilleri okuyamaz", !!q.error || (q.data ?? []).length === 0, q.error?.message);
  await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PW });
  q = await anon.from("profiles").select("score").limit(1);
  expect("giriş yapmış kullanıcı da tablolara doğrudan erişemez", !!q.error, q.error?.message);
  q = await anon.from("profiles").update({ score: 9999 }).eq("id", uid).select();
  expect("tarayıcıdan puan yazılamaz", !!q.error || (q.data ?? []).length === 0, q.error?.message);
  q = await anon.from("messages").select("conversation_id");
  const convs = new Set((q.data ?? []).map((m) => m.conversation_id));
  expect("canlı mesaj kuralı: sadece kendi sohbetleri", !q.error && convs.size === 1 && convs.has(convId), `${convs.size} sohbet`);
  q = await anon.from("messages").insert({ conversation_id: convId, sender_id: uid, text: "doğrudan" });
  expect("tarayıcıdan mesaj eklenemez", !!q.error, q.error?.message);
  q = await anon.from("notifications").select("user_id");
  expect("bildirimler: sadece kendininkiler", !q.error && (q.data ?? []).every((n) => n.user_id === uid), `${q.data?.length} bildirim`);

  // --- Çıkış ---
  r = await call("logout");
  const p2 = await fetch(BASE + "/profil", { headers: { Cookie: cookieHeader() }, redirect: "manual" });
  expect("çıkıştan sonra korumalı sayfa girişe yönlendirir", p2.status === 307, String(p2.status));

  // Temizlik
  await admin.auth.admin.deleteUser(uid);
  console.log(`\n${pass} geçti, ${fail} kaldı`);
}

main().catch(async (e) => {
  console.error("TEST HATASI:", e);
  process.exit(1);
});
