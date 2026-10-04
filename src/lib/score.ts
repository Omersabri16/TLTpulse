// Puan kuralları (kararlar.md Bölüm 5). Hepsi kural tabanlı ve deterministik:
// aynı girdi her zaman aynı puanı verir. AI puan vermez.
import { COMPETITIONS, USERS } from "./mock";
import type {
  Certificate,
  CertProvider,
  CertStatus,
  Difficulty,
  Field,
  Level,
  Profile,
  Project,
  ProjectAnalysis,
  Quality,
  Reference,
  Roadmap,
  RoadmapStep,
  ScoreSource,
} from "./types";

export const SOURCES: ScoreSource[] = ["Projeler", "Yarışmalar", "Akran puanı", "Sertifikalar", "Referanslar", "Yol haritası"];

const PEER_POINTS_PER_COMPETITION = 15;

export const levelOf = (score: number): Level => (score >= 80 ? "Kıdemli" : score >= 60 ? "Orta" : "Yeni başlayan");
export const levelLabel = (l: Level) => (l === "Yeni başlayan" ? "Yeni başlayan ligi" : `${l} lig`);

/** Basit, deterministik hash: aynı link her zaman aynı sonucu versin. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// ---------- Proje analizi ----------

export const DIFFICULTY_POINTS: Record<Difficulty, number> = { Kolay: 2, Orta: 4, Zor: 6 };
export const QUALITY_POINTS: Record<Quality, number> = { Zayıf: 2, İyi: 3, "Çok iyi": 4 };

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export interface AnalyzeInput {
  repoUrl: string;
  techs: string[];
  role: "Tek başıma" | "Takımla";
  checks: ProjectAnalysis["checks"];
  githubUser: string;
}

export type AnalyzeResult = { ok: true; analysis: ProjectAnalysis } | { ok: false; reason: string; authorship?: number };

/**
 * Demo analizi. Gerçekte GitHub API'den commit yazarlığı, dosya ağacı (test klasörü,
 * CI dosyası, README) ve dil dağılımı okunacak; puan kuralı aynı kalacak.
 */
export function analyzeProject(input: AnalyzeInput): AnalyzeResult {
  const parsed = parseRepoUrl(input.repoUrl);
  if (!parsed) return { ok: false, reason: "Geçerli bir GitHub repo linki gir: github.com/kullanici/repo" };
  const h = hash(parsed.owner.toLowerCase() + "/" + parsed.repo.toLowerCase());
  const own = input.githubUser && parsed.owner.toLowerCase() === input.githubUser.toLowerCase();
  // Kendi hesabındaki repo yüksek, başkasınınki (fork, katkı) düşük yazarlık alır.
  const authorship = own ? 82 + (h % 19) : h % 28;
  if (authorship < 10)
    return { ok: false, authorship, reason: `Bu repodaki commit'lerin sadece %${authorship}'i senin. Eklemek için en az %10 olmalı (fork'lar bu yüzden eklenemiyor).` };

  const commits = 12 + (h % 150);
  const c = input.checks;
  const size = input.techs.length + ((h >> 3) % 3) + (input.role === "Takımla" ? 0 : 1) + (commits > 90 ? 1 : 0);
  const difficulty: Difficulty = size <= 2 ? "Kolay" : size <= 4 ? "Orta" : "Zor";
  const q = [c.readme, c.tests, c.ci, c.demo, commits > 50].filter(Boolean).length;
  const quality: Quality = q <= 1 ? "Zayıf" : q <= 3 ? "İyi" : "Çok iyi";
  const points = DIFFICULTY_POINTS[difficulty] + QUALITY_POINTS[quality];

  const plus: string[] = [];
  const minus: string[] = [];
  (c.tests ? plus : minus).push("test");
  (c.ci ? plus : minus).push("CI");
  (c.readme ? plus : minus).push("README");
  if (c.demo) plus.push("canlı demo");
  const summary =
    `${input.techs.length} teknoloji ve ${commits} commit ile ${difficulty.toLowerCase()} bir proje.` +
    (plus.length ? ` Artılar: ${plus.join(", ")}.` : "") +
    (minus.length ? ` Eksik: ${minus.join(", ")}.` : "");

  return { ok: true, analysis: { difficulty, quality, authorship, commits, checks: c, points, summary } };
}

// ---------- Sertifika doğrulama ----------

/** Demo doğrulaması. Gerçekte BTK Akademi / Credly kaynağından çekilecek (kararlar.md Bölüm 6). */
export function verifyCertificate(provider: CertProvider, link: string, nameOnCert: string, profileName: string): { status: CertStatus; points: number } {
  const norm = (s: string) =>
    s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
  const known = provider === "BTK Akademi" || provider === "Credly";
  const linkOk =
    (provider === "BTK Akademi" && /btkakademi\.gov\.tr/.test(link)) ||
    (provider === "Credly" && /credly\.com/.test(link)) ||
    (provider === "Coursera" && /coursera\.org/.test(link)) ||
    (provider === "Udemy" && /udemy\.com/.test(link));
  if (!linkOk) return { status: "Doğrulanamadı", points: 1 };
  if (nameOnCert && norm(nameOnCert) !== norm(profileName)) return { status: "İsim uyuşmuyor", points: 0 };
  return { status: "Doğrulandı", points: known ? 4 : 3 };
}

// ---------- Referans ----------

const PERSONAL = /@(gmail|hotmail|outlook|yahoo|icloud|yandex|protonmail)\./i;
export const isCorporateEmail = (email: string) => !PERSONAL.test(email);
/** Kurumsal e-posta tam, kişisel e-posta düşük ağırlık; yorum yazılırsa +1. */
export const referencePoints = (email: string, hasComment: boolean) => (isCorporateEmail(email) ? 5 : 2) + (hasComment ? 1 : 0);

// ---------- Toplam puan ----------

export interface ScoreInput {
  username: string;
  profile: Profile | null;
  projects: Project[];
  certs: Certificate[];
  references: Reference[];
  peerReceived: { stars: number; competitionId?: string }[];
  roadmap: Roadmap | null;
  roadmapDone: string[];
}

export function competitionPoints(username: string) {
  let pts = 0;
  const items: { label: string; points: number; id: string }[] = [];
  for (const c of COMPETITIONS) {
    if (c.status !== "Tamamlandı") continue;
    const t = c.teams.find((t) => t.members.some((m) => m.username === username));
    if (!t) continue;
    const bonus = t.rank === 1 ? 8 : t.rank === 2 ? 6 : t.rank === 3 ? 4 : 0;
    pts += 4 + bonus;
    items.push({ id: c.id, label: `${c.code} ${c.title}${t.rank && t.rank <= 3 ? ` · ${t.rank}. takım` : " · katılım"}`, points: 4 + bonus });
  }
  return { points: pts, items };
}

/** Her yarışmada takım arkadaşlarının ortalaması 15 üzerinden; yarışmalar toplanır, genel sınır yok. */
export function peerPoints(ratings: { stars: number; competitionId?: string }[]) {
  const by = new Map<string, number[]>();
  for (const r of ratings) {
    const k = r.competitionId ?? "";
    by.set(k, [...(by.get(k) ?? []), r.stars]);
  }
  let pts = 0;
  for (const stars of by.values()) pts += (stars.reduce((a, b) => a + b, 0) / stars.length / 5) * PEER_POINTS_PER_COMPETITION;
  return Math.round(pts);
}

export function computeScore(s: ScoreInput) {
  const doneSteps = s.roadmap ? s.roadmap.steps.filter((st) => s.roadmapDone.includes(st.id)) : [];
  const raw: Record<ScoreSource, number> = {
    Projeler: s.projects.reduce((a, p) => a + p.analysis.points, 0),
    Yarışmalar: competitionPoints(s.username).points,
    "Akran puanı": peerPoints(s.peerReceived),
    Sertifikalar: s.certs.reduce((a, c) => a + c.points, 0),
    Referanslar: s.references.filter((r) => r.status === "Onaylandı").reduce((a, r) => a + r.points, 0),
    "Yol haritası": doneSteps.reduce((a, st) => a + st.points, 0),
  };
  const parts = SOURCES.map((src) => ({ source: src, points: raw[src] }));
  const total = parts.reduce((a, p) => a + p.points, 0);
  return { total, level: levelOf(total), parts };
}

// ---------- Lig ----------

export interface LeagueRow {
  username: string;
  name: string;
  school: string;
  city: string;
  field: Field;
  score: number;
  trend: number;
  me?: boolean;
}

export function leagueRows(me: LeagueRow | null) {
  const rows: LeagueRow[] = USERS.map((u) => ({ username: u.username, name: u.name, school: u.school, city: u.city, field: u.field, score: u.score, trend: u.trend }));
  if (me) rows.push({ ...me, me: true });
  return rows.sort((a, b) => b.score - a.score);
}

export function myRank(me: LeagueRow) {
  const lvl = levelOf(me.score);
  const same = leagueRows(me).filter((r) => levelOf(r.score) === lvl);
  return { rank: same.findIndex((r) => r.me) + 1, of: same.length };
}

// ---------- Profil doluluğu ve AI yol haritası ----------

export function completeness(profile: Profile | null, projects: Project[]) {
  const p = profile;
  const items = [
    { label: "Alanını seç", done: !!p?.field, href: "/profil?duzenle=1" },
    { label: "Okulunu ekle", done: !!p?.school, href: "/profil?duzenle=1" },
    { label: "Hakkında yaz", done: (p?.about.length ?? 0) >= 40, href: "/profil?duzenle=1" },
    { label: "GitHub kullanıcı adını ekle", done: !!p?.github, href: "/profil?duzenle=1" },
    { label: "En az 3 beceri ekle", done: (p?.skills.length ?? 0) >= 3, href: "/profil?duzenle=1" },
    { label: "İlgi alanı ekle", done: (p?.interests.length ?? 0) >= 1, href: "/profil?duzenle=1" },
    { label: "En az bir proje ekle", done: projects.length >= 1, href: "/projeler" },
    { label: "Deneyim ya da eğitim ekle", done: (p?.experiences.length ?? 0) + (p?.education.length ?? 0) >= 1, href: "/profil?duzenle=1" },
  ];
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { percent, items, ready: percent >= 75 };
}

export const ROADMAP_MIN = 75;

export interface RoadmapContext {
  profile: Profile;
  projects: Project[];
  certs: Certificate[];
  references: Reference[];
  applications: Record<string, Field>;
  peerGivenCount: number;
}

/** Bir adımın tamamlanıp tamamlanmadığını mevcut veriden çıkarır. */
export function stepDone(step: RoadmapStep, ctx: RoadmapContext, baseline: Roadmap["baseline"]) {
  switch (step.check) {
    case "project_any":
      return ctx.projects.length > baseline.projects;
    case "project_tests":
      return ctx.projects.filter((p) => p.analysis.checks.tests).length > baseline.testedProjects;
    case "project_hard":
      return ctx.projects.filter((p) => p.analysis.difficulty === "Zor").length > baseline.hardProjects;
    case "apply_competition":
      return Object.keys(ctx.applications).length > baseline.applications;
    case "certificate":
      return ctx.certs.filter((c) => c.status === "Doğrulandı").length > baseline.certs;
    case "reference":
      return ctx.references.filter((r) => r.status === "Onaylandı").length > baseline.references;
    case "peer_rating":
      return ctx.peerGivenCount > baseline.peerGiven;
    case "about":
      return ctx.profile.about.length >= 120;
  }
}

const TARGET_SKILLS: Record<Field, string[]> = {
  Frontend: ["React", "TypeScript", "Erişilebilirlik", "Next.js"],
  Backend: ["Node.js", "PostgreSQL", "Docker", "Redis"],
  Veritabanı: ["SQL", "PostgreSQL", "İndeksleme", "Yedekleme"],
  Mobil: ["Flutter", "Kotlin", "Swift", "Çevrimdışı veri"],
  DevOps: ["Docker", "Kubernetes", "CI/CD", "Gözlemlenebilirlik"],
};

/**
 * AI yol haritası. Gerçekte profil özeti Gemini'ye gönderilip adımlar JSON olarak alınacak;
 * burada aynı çıktı şeklini kural tabanlı üretiyoruz.
 */
export function generateRoadmap(ctx: RoadmapContext, target: Field): Roadmap {
  const { profile, projects, certs, references } = ctx;
  const tested = projects.filter((p) => p.analysis.checks.tests).length;
  const hard = projects.filter((p) => p.analysis.difficulty === "Zor").length;
  const verifiedCerts = certs.filter((c) => c.status === "Doğrulandı").length;
  const approved = references.filter((r) => r.status === "Onaylandı").length;
  const missing = TARGET_SKILLS[target].filter((s) => !profile.skills.some((k) => k.name.toLowerCase() === s.toLowerCase() && k.proof !== "Beyan"));
  const openComp = COMPETITIONS.find((c) => c.status === "Başvurular açık" && c.positions.some((p) => p.field === target));

  const steps: RoadmapStep[] = [];
  const add = (s: Omit<RoadmapStep, "id">) => steps.push({ ...s, id: `s-${steps.length + 1}` });

  if (missing.length)
    add({ title: `${missing[0]} kullanan bir ${target} projesi ekle`, detail: `${target} hedefin için ${missing[0]} kanıtı eksik. Küçük ama bitmiş bir proje yeter.`, points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" }, check: "project_any" });
  if (tested <= hard || tested < 2)
    add({ title: "Testleri olan bir proje ekle", detail: "Projelerinin çoğunda test yok. Testli bir proje, kalite puanını doğrudan artırır.", points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" }, check: "project_tests" });
  if (openComp)
    add({ title: `${openComp.code} ${openComp.title} yarışmasında ${target} pozisyonuna başvur`, detail: "Takımla yapılan iş hem yarışma hem akran puanı getirir.", points: 2, action: { label: "Yarışmayı incele", href: `/yarismalar/${openComp.id}` }, check: "apply_competition" });
  if (approved < 2)
    add({ title: "Staj amirinden ya da hocandan onay al", detail: "Kurumsal e-postadan gelen bir onay, deneyimini kanıtlı hale getirir.", points: 2, action: { label: "Onay iste", href: "/profil?onay=1" }, check: "reference" });
  if (verifiedCerts < 3)
    add({ title: `${target} alanında doğrulanabilir bir sertifika ekle`, detail: "BTK Akademi ya da Credly sertifikaları otomatik doğrulanır.", points: 1, action: { label: "Sertifika ekle", href: "/profil?sertifika=1" }, check: "certificate" });
  if (hard < 2)
    add({ title: "Zor seviyesinde bir proje bitir", detail: "Birden fazla servis, kuyruk ya da gerçek zamanlı bir özellik projeyi zor seviyesine taşır.", points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" }, check: "project_hard" });
  if (profile.about.length < 120)
    add({ title: "Hakkında bölümünü genişlet", detail: "Ne üzerinde çalışmayı sevdiğini iki üç cümleyle anlat.", points: 1, action: { label: "Profili düzenle", href: "/profil?duzenle=1" }, check: "about" });
  add({ title: "Bitirdiğin bir yarışmada takım arkadaşlarını puanla", detail: "Akran puanı karşılıklı işler; sen de puan verdiğinde sistem daha adil olur.", points: 1, action: { label: "Yarışmalar", href: "/yarismalar" }, check: "peer_rating" });

  const picked = steps.slice(0, 6);
  // Adım puanı + adımın kendisinin getireceği puan (proje, onay vb.) için kaba tahmin.
  const summary =
    `${target} hedefin için en büyük eksik ${missing.length ? missing.slice(0, 2).join(" ve ") + " kanıtı" : "projelerinin kalitesi"}. ` +
    `Aşağıdaki ${picked.length} adım seni yaklaşık ${picked.reduce((a, s) => a + s.points, 0) + 15} puan ileri taşır.`;

  return {
    target,
    generatedAt: new Date().toISOString(),
    summary,
    steps: picked,
    baseline: {
      projects: projects.length,
      testedProjects: tested,
      hardProjects: hard,
      applications: Object.keys(ctx.applications).length,
      certs: verifiedCerts,
      references: approved,
      peerGiven: ctx.peerGivenCount,
    },
  };
}
