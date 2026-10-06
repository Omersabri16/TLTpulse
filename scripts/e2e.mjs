// Uçtan uca test: dev sunucusu açıkken (varsayılan :3100) `node scripts/e2e.mjs`. Önce `npm run db:seed` (sezon testleri
// seed verisine göre). Geçici bir test kullanıcısı açıp sonunda hesap silme aksiyonuyla siler; ekip Gmail adresine bir onay
// e-postası gönderir; GitHub ve Gemini'ye gerçek istek atar.
import { createHash, createHmac, randomBytes } from "node:crypto";
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
// ≥10 kaynak dosyalı, sindresorhus'un çoğunu yazdığı herkese açık bir repo (yazarlık ve kopya kontrolü için).
const REPO = "https://github.com/sindresorhus/ky";

async function main() {
  console.log("aksiyonlar:", Object.keys(actions).length);

  // Hazırlık: temiz test kullanıcısı
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of list.data.users.filter((u) => u.email === TEST_EMAIL)) await admin.auth.admin.deleteUser(u.id);
  const created = await admin.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PW, email_confirm: true, user_metadata: { name: "Test Bot" } });
  const uid = created.data.user.id;

  // --- Yetkisiz çağrılar ve kayıt kuralları ---
  let r = await call("saveProfile", { about: "x" });
  expect("girişsiz profil kaydı reddedilir", !r.ok && /giriş/i.test(r.error), r.error);
  r = await call("register", { name: "Test Kişi", email: "kvkk-yok@demo.example.com", password: "Sifre12345!" });
  expect("KVKK onayı olmadan kayıt olunmaz", !r.ok && /aydınlatma/i.test(r.error), r.error);
  r = await call("login", { email: TEST_EMAIL, password: "yanlis-sifre" });
  expect("yanlış şifre reddedilir", !r.ok && /yanlış/i.test(r.error), r.error);
  const brute = `brute-${randomBytes(4).toString("hex")}@demo.example.com`;
  for (let i = 0; i < 10; i++) await call("login", { email: brute, password: "yanlis-sifre" });
  r = await call("login", { email: brute, password: "yanlis-sifre" });
  expect("aynı e-postaya 11. deneme hız sınırına takılır", !r.ok && /çok fazla/i.test(r.error), r.error);

  // --- Giriş ---
  r = await call("login", { email: TEST_EMAIL, password: TEST_PW });
  expect("giriş", r.ok && r.data.session?.username, r.ok ? r.data.session.username : r.error);
  expect("yeni kullanıcı Yeni başlayan liginde, sezon puanı 0", r.ok && r.data.score.level === "Yeni başlayan" && r.data.score.season === 0 && r.data.season?.id >= 1);
  const page = await fetch(BASE + "/profil", { headers: { Cookie: cookieHeader() }, redirect: "manual" });
  expect("korumalı sayfa açılır", page.status === 200, String(page.status));
  // Korumalı sayfaları oturumla derlet ki aksiyon kimlikleri manifest'e girsin.
  for (const p of ["/yarismalar/y-07", "/takim/x", "/mesajlar", "/yol-haritasi", "/projeler", "/puan", "/onboarding", "/hesap", "/yonetim"]) await fetch(BASE + p, { headers: { Cookie: cookieHeader() } });
  walk(".next/dev/server/app");
  const yon = await fetch(BASE + "/yonetim", { headers: { Cookie: cookieHeader() }, redirect: "manual" });
  expect("yönetici olmayana /yonetim yok (404)", yon.status === 404, String(yon.status));

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
  r = await call("saveProfile", { field: "Hacker" });
  expect("geçersiz alan reddedilir", !r.ok, r.error);
  r = await call("verifyGithub");
  expect("bio'da kod yoksa GitHub doğrulanmaz", !r.ok && /bio/i.test(r.error), r.error);
  r = await call("previewProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi." });
  expect("doğrulanmamış GitHub ile proje eklenemez", !r.ok && /doğrula/i.test(r.error), r.error);

  await admin.from("profiles").update({ github_verified: true }).eq("id", uid);

  // --- Proje değerlendirmesi ---
  r = await call("previewProject", { repoUrl: "https://github.com/vercel/next.js", name: "next", description: "başkasının reposu, yazarlık düşük olmalı" });
  expect("başkasının reposu yazarlıkla reddedilir", r.ok && !r.data.ok && r.data.kind === "yazarlık", r.ok ? r.data.reason : r.error);
  r = await call("previewProject", { repoUrl: "https://evil.com/a/b", name: "x", description: "en az on beş karakterlik açıklama" });
  expect("GitHub dışı link reddedilir (SSRF)", !r.ok, r.error);
  r = await call("previewProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi.", demoUrl: "https://127.0.0.1/" });
  expect("gerçek analiz: AI zorluk + gerekçe dosyası repoda", r.ok && r.data.ok && (r.data.pending || r.data.analysis.reasons.length > 0), r.ok ? JSON.stringify(r.data.ok ? { ...r.data.analysis, summary: undefined } : r.data).slice(0, 400) : r.error);
  expect("iç ağ adresindeki demo 'açılıyor' sayılmaz (SSRF)", r.ok && r.data.ok && !r.data.analysis.checks.demo);
  expect("teknolojiler repodan çıkarıldı", r.ok && r.data.ok && r.data.techs.length > 0, r.ok && r.data.ok ? r.data.techs.join(", ") : "");
  r = await call("addProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi.", demoUrl: "javascript:alert(1)" });
  expect("javascript: demo linki reddedilir", !r.ok, r.error);
  r = await call("addProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi." });
  const added = r.ok ? r.data : null;
  expect("proje eklendi, puan defterden (sezon = toplam)", added && (added.pending || (added.points > 0 && added.me.score.season === added.points && added.me.score.total === added.points)), added ? `+${added.points}, sezon ${added.me.score.season}` : r.error);
  const proj = added?.me.projects.find((p) => p.name === "ky");
  const files = proj ? (await admin.from("project_files").select("blob_sha").eq("project_id", proj.id)).data ?? [] : [];
  expect("dosya özetleri kaydedildi", files.length >= 10, `${files.length} dosya`);
  r = await call("addProject", { repoUrl: REPO, name: "tekrar", description: "aynı repo ikinci kez eklenmemeli" });
  expect("aynı proje iki kez eklenemez", !r.ok, r.error);
  r = await call("reanalyzeProject", proj?.id);
  expect("yeni commit yokken yeniden analiz edilmez", !r.ok && /commit/i.test(r.error), r.error);

  // Kopya: aynı dosyalar başka bir kullanıcının projesinde varsa red.
  const shas = files.map((f) => f.blob_sha);
  r = await call("removeProject", proj?.id);
  expect("proje kaldırılınca puanı geri alınır", r.ok && r.data.score.season === 0 && r.data.history.some((h) => h.points < 0), r.ok ? String(r.data.score.season) : r.error);
  const others = [];
  for (const name of ["kopya1", "kopya2", "kopya3"]) {
    const u = (await admin.auth.admin.createUser({ email: `${name}@demo.example.com`, password: randomBytes(16).toString("base64url"), email_confirm: true })).data.user;
    await admin.from("profiles").insert({ id: u.id, username: `e2e${name}`, name: `E2E ${name}`, cv_code: `TLT-${randomBytes(5).toString("hex").toUpperCase()}`, github_code: "x" });
    const p = (await admin.from("projects").insert({ user_id: u.id, name, repo_owner: "kopya", repo_name: name, description: "kopya proje deneme", techs: ["JS"], role: "Tek başıma", analysis: {}, points: 0 }).select("id").single()).data;
    others.push({ uid: u.id, pid: p.id });
  }
  await admin.from("project_files").insert(shas.map((s) => ({ project_id: others[0].pid, user_id: others[0].uid, blob_sha: s })));
  r = await call("previewProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi." });
  expect("başka projede %50+ aynı dosya: kopya reddi", r.ok && !r.data.ok && r.data.kind === "kopya", r.ok ? r.data.reason ?? "kabul edildi" : r.error);
  for (const o of others.slice(1)) await admin.from("project_files").insert(shas.map((s) => ({ project_id: o.pid, user_id: o.uid, blob_sha: s })));
  r = await call("previewProject", { repoUrl: REPO, name: "ky", description: "fetch tabanlı küçük HTTP istemcisi." });
  expect("3+ kullanıcıda aynı dosyalar şablon sayılır: şablon reddi", r.ok && !r.data.ok && r.data.kind === "şablon", r.ok ? r.data.reason ?? "kabul edildi" : r.error);
  for (const o of others) await admin.auth.admin.deleteUser(o.uid);

  // --- Sertifika ve onay (yeni ölçek) ---
  r = await call("addCertificate", { name: "SQL", provider: "BTK Akademi", link: "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=AB12", nameOnCert: "Test Bot" });
  expect("BTK sertifikası +20", r.ok && r.data.points === 20 && r.data.me.score.season === 20, r.ok ? `${r.data.points}, sezon ${r.data.me.score.season}` : r.error);
  r = await call("addCertificate", { name: "Sahte", provider: "BTK Akademi", link: "https://btkakademi.gov.tr.evil.com/x", nameOnCert: "Test Bot" });
  expect("sahte alan adı doğrulanmaz (+5)", r.ok && r.data.points === 5, r.ok ? String(r.data.points) : r.error);

  const me = (await call("refreshMe")).data;
  const exp = (await admin.from("experiences").insert({ user_id: uid, kind: "Staj", title: "Backend stajyeri", org: "Test A.Ş.", start_label: "Haz 2025", end_label: "Ağu 2025" }).select("id").single()).data;
  r = await call("requestApproval", { target: { type: "experience", id: exp.id }, approverName: "Test Onaylayıcı", approverEmail: TEST_EMAIL, relation: "Staj amiri" });
  expect("kendi e-postanla onay istenemez", !r.ok, r.error);
  r = await call("requestApproval", { target: { type: "experience", id: "00000000-0000-0000-0000-000000000000" }, approverName: "X Y", approverEmail: "x@firma.com", relation: "Hoca" });
  expect("başkasının deneyimi için onay istenemez", !r.ok, r.error);
  r = await call("requestApproval", { target: { type: "experience", id: exp.id }, approverName: "TLTpulse Ekip", approverEmail: env.GMAIL_ADDRESS, relation: "Staj amiri" });
  expect("gerçek onay e-postası gönderildi (ekip Gmail'ine)", r.ok, r.ok ? "" : r.error);
  const pending = r.ok ? r.data.references.find((x) => x.status === "Bekliyor") : null;
  const token = randomBytes(32).toString("base64url");
  if (pending) await admin.from("approvals").update({ token_hash: createHash("sha256").update(token).digest("hex") }).eq("id", pending.token);
  const saved = { ...cookies };
  cookies = {};
  r = await call("answerApproval", { token, approve: true, comment: "Çok iyi çalıştı." });
  expect("onay verildi (girişsiz)", r.ok && r.data.approved, r.ok ? "" : r.error);
  r = await call("answerApproval", { token, approve: false });
  expect("aynı link ikinci kez kullanılamaz", !r.ok, r.error);
  cookies = saved;
  const after = (await call("refreshMe")).data;
  expect("onay puanı: kişisel e-posta 10 + yorum 5", after.score.season - me.score.season === 15, `${me.score.season} → ${after.score.season}`);

  // --- Yarışma ---
  r = await call("applyCompetition", { competitionId: "y-07", field: "Backend", note: "test" });
  expect("açık yarışmaya başvuru (lig kısıtı yok)", r.ok && r.data.applications["y-07"] === "Backend", r.ok ? "" : r.error);
  r = await call("applyCompetition", { competitionId: "y-05", field: "Backend" });
  expect("biten yarışmaya başvurulamaz", !r.ok, r.error);
  r = await call("applyCompetition", { competitionId: "y-07", field: "Mobil" });
  expect("olmayan pozisyona başvurulamaz", !r.ok, r.error);
  r = await call("applyCompetition", { competitionId: "y-09", field: "Backend" });
  expect("sıradaki (yayınlanmamış) yarışmaya başvurulamaz", !r.ok, r.error);
  r = await call("withdrawCompetition", "y-07");
  expect("başvuru geri çekildi", r.ok && !r.data.applications["y-07"], r.ok ? "" : r.error);
  const kontrast = (await admin.from("teams").select("id").eq("competition_id", "y-06").eq("name", "Kontrast").single()).data;
  r = await call("submitTeamRepo", { teamId: kontrast.id, repoUrl: "https://github.com/a/b", demoUrl: "https://a.vercel.app" });
  expect("üyesi olmadığın takıma teslim yapılamaz", !r.ok, r.error);
  r = await call("sendTeamMessage", { teamId: kontrast.id, text: "sızma denemesi" });
  expect("üyesi olmadığın takıma mesaj yazılamaz", !r.ok, r.error);
  r = await call("runPublicTests", kontrast.id);
  expect("üyesi olmadığın takımın testlerini başlatamazsın", !r.ok, r.error);
  const durak = (await admin.from("teams").select("id").eq("competition_id", "y-05").eq("name", "Durak").single()).data;
  r = await call("ratePeers", { teamId: durak.id, ratings: { selinaksoy: 1 } });
  expect("başka takımın üyesini puanlayamazsın", !r.ok, r.error);
  const y05 = await fetch(BASE + "/yarismalar/y-05", { headers: { Cookie: cookieHeader() } }).then((x) => x.text());
  expect("tamamlanan yarışmada karne var, jüri/kürsü yok", /karne/i.test(y05) && !/Jüri:/i.test(y05));

  // --- Yönetici yetkisi ---
  r = await call("createCompetition", { title: "Sızma", tagline: "", difficulty: "Kolay", specId: "kitap-listesi", publishOn: "2026-12-01", applyDeadline: "2026-12-05", start: "2026-12-07", end: "2026-12-20" });
  expect("normal kullanıcı yarışma oluşturamaz", !r.ok && /yönetici/i.test(r.error), r.error);
  r = await call("evaluateNow", "y-06");
  expect("normal kullanıcı değerlendirme başlatamaz", !r.ok && /yönetici/i.test(r.error), r.error);
  r = await call("closeSeasonNow", "SEZONU BİTİR");
  expect("normal kullanıcı sezonu bitiremez", !r.ok && /yönetici/i.test(r.error), r.error);
  await admin.from("profiles").update({ is_admin: true }).eq("id", uid);
  r = await call("createCompetition", { title: "E2E Kitap", tagline: "deneme", difficulty: "Kolay", specId: "kitap-listesi", publishOn: "2026-12-01", applyDeadline: "2026-12-05", start: "2026-12-07", end: "2026-12-20" });
  expect("yönetici taslak yarışma oluşturur", r.ok && /^y-\d+$/.test(r.data), r.ok ? r.data : r.error);
  const draftId = r.ok ? r.data : null;
  r = await call("queueCompetition", draftId);
  expect("bankadaki doğrulanmış şartname sıraya konur (kilitlenir)", r.ok, r.ok ? "" : r.error);
  const locked = (await admin.from("competitions").select("status, locked").eq("id", draftId).single()).data;
  expect("sıradaki yarışma kilitli", locked?.status === "Sırada" && locked.locked === true);
  r = await call("generateTestsAction", draftId);
  expect("kilitli yarışmanın testleri değiştirilemez", !r.ok && /değişmez/i.test(r.error), r.error);
  r = await call("cancelCompetition", { id: draftId, reason: "e2e testi bitti" });
  expect("yönetici iptal eder", r.ok, r.ok ? "" : r.error);
  await admin.from("competitions").delete().eq("id", draftId);
  await admin.from("profiles").update({ is_admin: false }).eq("id", uid);

  // --- Sezon kuralları (yazmadan önizleme: seed verisiyle) ---
  const moves = new Map(((await admin.rpc("season_moves")).data ?? []).map((m) => [m.user_id, m]));
  const idOf = async (u) => (await admin.from("profiles").select("id").eq("username", u).single()).data?.id;
  const mv = async (u) => moves.get(await idOf(u));
  const deniz = await mv("denizkaya");
  expect("Orta 21. (130 puan) yükselme çizgisinin altında: Orta'da kalır", deniz?.to_league === "Orta" && Number(deniz.rank) === 21, JSON.stringify(deniz));
  const ece = await mv("eceyilmaz");
  expect("Orta 1. (100+) Kıdemli'ye yükselir", ece?.to_league === "Kıdemli");
  const irem = await mv("irempolat");
  expect("Orta son 20'de ve 100 altı: Yeni başlayan'a düşer", irem?.to_league === "Yeni başlayan");
  const hakan = await mv("hakanarslan");
  expect("Kıdemli 100 altı: Orta'ya düşer", hakan?.to_league === "Orta");
  const burak = await mv("burakatan");
  expect("Kıdemli ilk 20 (100+): sezon şampiyonu", burak?.champion === true && burak.to_league === "Kıdemli");
  const ayse = await mv("aysayildiz");
  expect("Yeni başlayan 96 puan: yükselmez (100 sınırı)", ayse?.to_league === "Yeni başlayan");
  const zehra = await mv("zehrakurt");
  expect("Yeni başlayan ilk 20 (100+): Orta'ya yükselir", zehra?.to_league === "Orta");

  // --- Engelle, şikayet, veri indirme ---
  r = await call("blockUser", "denizkaya");
  expect("engelleme", r.ok && r.data.blocked.includes("denizkaya"), r.ok ? "" : r.error);
  r = await call("startConversation", "denizkaya");
  expect("engellenen kişiye mesaj açılamaz", !r.ok, r.error);
  r = await call("unblockUser", "denizkaya");
  expect("engel kaldırıldı", r.ok && !r.data.blocked.includes("denizkaya"));
  r = await call("startConversation", "denizkaya");
  expect("sohbet açıldı", r.ok && r.data.id, r.ok ? "" : r.error);
  const convId = r.data.id;
  r = await call("sendMessage", { conversationId: convId, text: "Merhaba Deniz, test mesajı." });
  expect("mesaj gönderildi", r.ok, r.ok ? "" : r.error);
  const other = await admin.from("conversations").select("id").neq("id", convId).limit(1).single();
  r = await call("sendMessage", { conversationId: other.data.id, text: "başkasının sohbetine" });
  expect("başkasının sohbetine mesaj yazılamaz", !r.ok, r.error);
  r = await call("reportContent", { targetType: "Profil", targetId: "denizkaya", username: "denizkaya", reason: "e2e şikayet denemesi" });
  expect("şikayet kaydedildi", r.ok, r.ok ? "" : r.error);
  await admin.from("reports").delete().eq("reporter_id", uid);
  r = await call("exportMyData");
  expect("verilerimi indir: profil ve puan geçmişi var", r.ok && r.data.profil?.username && Array.isArray(r.data.puan_gecmisi), r.ok ? "" : r.error);

  // --- Askıya alma ---
  await admin.from("profiles").update({ suspended: true }).eq("id", uid);
  r = await call("saveProfile", { about: "askıdayken" });
  expect("askıdaki kullanıcı işlem yapamaz", !r.ok && /askıya/i.test(r.error), r.error);
  const lig = await fetch(BASE + "/lig").then((x) => x.text());
  expect("askıdaki kullanıcı ligde görünmez", !lig.includes("Test Bot"));
  await admin.from("profiles").update({ suspended: false }).eq("id", uid);

  // --- Yol haritası ---
  r = await call("createRoadmap", "Backend");
  expect("yol haritası oluştu, adım puanları 5–10", r.ok && r.data.me.roadmap?.steps.every((s) => s.points >= 5 && s.points <= 10), r.ok ? `ai=${r.data.ai}, ${r.data.me.roadmap.steps.length} adım` : r.error);

  // --- Rozet ---
  const rozet = await fetch(`${BASE}/rozet/denizkaya`);
  const svg = await rozet.text();
  expect("README rozeti SVG, önbellekli", rozet.status === 200 && rozet.headers.get("content-type")?.includes("svg") && /max-age=3600/.test(rozet.headers.get("cache-control") ?? "") && svg.includes("Orta lig"));
  expect("rozet: geçersiz kullanıcı adı 404", (await fetch(`${BASE}/rozet/..%2Fetc`)).status === 404);

  // --- Cron ve imzalı sonuç route'u ---
  expect("cron: anahtarsız istek 401", (await fetch(`${BASE}/api/cron/gunluk`)).status === 401);
  expect("cron: yanlış anahtar 401", (await fetch(`${BASE}/api/cron/gunluk`, { headers: { Authorization: "Bearer yanlis" } })).status === 401);
  const body = JSON.stringify({ nonce: "x".repeat(30), kind: "acik", competition_id: "y-06", teams: [] });
  expect("sonuç: imzasız istek 401", (await fetch(`${BASE}/api/degerlendirme`, { method: "POST", body })).status === 401);
  if (env.EVAL_SECRET && env.EVAL_SECRET.length >= 32) {
    const sign = (b) => {
      const ts = String(Math.floor(Date.now() / 1000));
      return { "x-tlt-zaman": ts, "x-tlt-imza": "sha256=" + createHmac("sha256", env.EVAL_SECRET).update(`${ts}.${b}`).digest("hex") };
    };
    expect("sonuç: imzalı ama bilinmeyen nonce 409", (await fetch(`${BASE}/api/degerlendirme`, { method: "POST", body, headers: sign(body) })).status === 409);
    const nonce = randomBytes(24).toString("base64url");
    await admin.from("evaluation_runs").insert({ competition_id: "y-06", kind: "acik", team_id: kontrast.id, nonce_hash: createHash("sha256").update(nonce).digest("hex") });
    const good = JSON.stringify({ nonce, kind: "acik", competition_id: "y-06", teams: [{ team_id: kontrast.id, reachable: true, tests: [{ id: "A1", title: "A1 Kayıt ve giriş token döner", public: true, passed: true }] }] });
    expect("sonuç: imzalı ve geçerli nonce kabul", (await fetch(`${BASE}/api/degerlendirme`, { method: "POST", body: good, headers: sign(good) })).status === 200);
    expect("sonuç: aynı istek tekrar gönderilemez", (await fetch(`${BASE}/api/degerlendirme`, { method: "POST", body: good, headers: sign(good) })).status === 409);
    const pr = (await admin.from("teams").select("public_run").eq("id", kontrast.id).single()).data;
    expect("açık test sonucu takıma yazıldı", pr?.public_run?.passed === 1);
  } else console.log("  (EVAL_SECRET yok: imzalı sonuç testleri atlandı)");

  // --- Tarayıcı tarafı (RLS) ---
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  let q = await anon.from("profiles").select("*").limit(1);
  expect("anonim profilleri okuyamaz", !!q.error || (q.data ?? []).length === 0, q.error?.message);
  await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PW });
  for (const t of ["profiles", "score_events", "project_files", "competition_results", "reports", "blocks", "evaluation_runs", "seasons", "credentials"]) {
    q = await anon.from(t).select("*").limit(1);
    expect(`tarayıcı ${t} tablosunu okuyamaz`, !!q.error || (q.data ?? []).length === 0, q.error?.message);
  }
  q = await anon.from("profiles").update({ is_admin: true }).eq("id", uid).select();
  expect("tarayıcıdan yönetici olunamaz", !!q.error || (q.data ?? []).length === 0, q.error?.message);
  q = await anon.rpc("close_season", { p_season: 1 });
  expect("tarayıcıdan sezon kapatılamaz (RPC kapalı)", !!q.error, q.error?.message);
  q = await anon.rpc("apply_score_items", { p_user: uid, p_items: [{ ref: "x", source: "Projeler", label: "hile", points: 999 }] });
  expect("tarayıcıdan puan defterine yazılamaz (RPC kapalı)", !!q.error, q.error?.message);
  q = await anon.from("messages").select("conversation_id");
  const convs = new Set((q.data ?? []).map((m) => m.conversation_id));
  expect("canlı mesaj kuralı: sadece kendi sohbetleri", !q.error && convs.size === 1 && convs.has(convId), `${convs.size} sohbet`);

  // --- Hesabı sil (KVKK) ---
  r = await call("deleteAccount", { password: "yanlis-sifre", confirm: "SİL" });
  expect("yanlış şifreyle hesap silinmez", !r.ok && /şifre/i.test(r.error), r.error);
  r = await call("deleteAccount", { password: TEST_PW, confirm: "SİL" });
  expect("hesap silindi", r.ok && r.data.session === null, r.ok ? "" : r.error);
  const gone = await admin.from("profiles").select("id").eq("id", uid).maybeSingle();
  const goneEvents = await admin.from("score_events").select("id", { count: "exact", head: true }).eq("user_id", uid);
  expect("profil ve puan geçmişi cascade ile silindi", !gone.data && (goneEvents.count ?? 0) === 0);
  const p2 = await fetch(BASE + "/profil", { headers: { Cookie: cookieHeader() }, redirect: "manual" });
  expect("silindikten sonra korumalı sayfa girişe yönlendirir", p2.status === 307, String(p2.status));

  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("TEST HATASI:", e);
  process.exit(1);
});
