// Puan kuralları (kararlar.md Bölüm 5). Hepsi kural tabanlı ve deterministik: aynı girdi her zaman aynı puanı verir.
// AI puan vermez. Saf fonksiyonlar: hem sunucu (puanı yazan tek yer) hem arayüz (önizleme) kullanır.
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
  RoadmapCheck,
  RoadmapStep,
  ScoreSource,
} from "./types";

export const SOURCES: ScoreSource[] = ["Projeler", "Yarışmalar", "Akran puanı", "Sertifikalar", "Referanslar", "Yol haritası"];

const PEER_POINTS_PER_COMPETITION = 15;

export const levelOf = (score: number): Level => (score >= 80 ? "Kıdemli" : score >= 60 ? "Orta" : "Yeni başlayan");
export const levelLabel = (l: Level) => (l === "Yeni başlayan" ? "Yeni başlayan ligi" : `${l} lig`);

/** Basit, deterministik hash (avatar rengi gibi görsel seçimler için; güvenlik için değil). */
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
export const MIN_AUTHORSHIP = 10;

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** GitHub'dan okunan sinyaller. Kutucuklar kullanıcıdan değil repodan gelir. */
export interface RepoSignals {
  techs: number;
  languages: number;
  files: number;
  commits: number;
  role: "Tek başıma" | "Takımla";
  readme: boolean;
  tests: boolean;
  ci: boolean;
  demo: boolean;
  authorship: number;
}

export function scoreRepo(s: RepoSignals): ProjectAnalysis {
  const size =
    s.techs +
    (s.languages >= 3 ? 1 : 0) +
    (s.files > 40 ? 1 : 0) +
    (s.files > 150 ? 1 : 0) +
    (s.role === "Tek başıma" ? 1 : 0) +
    (s.commits > 90 ? 1 : 0);
  const difficulty: Difficulty = size <= 3 ? "Kolay" : size <= 5 ? "Orta" : "Zor";
  const q = [s.readme, s.tests, s.ci, s.demo, s.commits > 50].filter(Boolean).length;
  const quality: Quality = q <= 1 ? "Zayıf" : q <= 3 ? "İyi" : "Çok iyi";
  const points = DIFFICULTY_POINTS[difficulty] + QUALITY_POINTS[quality];

  const plus: string[] = [];
  const minus: string[] = [];
  (s.tests ? plus : minus).push("test");
  (s.ci ? plus : minus).push("CI");
  (s.readme ? plus : minus).push("README");
  if (s.demo) plus.push("canlı demo");
  const summary =
    `${s.files} dosya, ${s.commits} commit ve ${s.techs} teknolojiyle ${difficulty.toLowerCase()} bir proje.` +
    (plus.length ? ` Artılar: ${plus.join(", ")}.` : "") +
    (minus.length ? ` Eksik: ${minus.join(", ")}.` : "");

  return {
    difficulty,
    quality,
    authorship: s.authorship,
    commits: s.commits,
    checks: { readme: s.readme, tests: s.tests, ci: s.ci, demo: s.demo },
    points,
    summary,
  };
}

// ---------- Sertifika doğrulama ----------

/** Kural tabanlı kontrol (kararlar.md Bölüm 6). Resmi kaynaktan çekme ileride bunun yerini alacak. */
export function verifyCertificate(provider: CertProvider, link: string, nameOnCert: string, profileName: string): { status: CertStatus; points: number } {
  const norm = (s: string) =>
    s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
  const known = provider === "BTK Akademi" || provider === "Credly";
  let host = "";
  try {
    host = new URL(link).hostname.toLowerCase();
  } catch {
    return { status: "Doğrulanamadı", points: 1 };
  }
  const on = (d: string) => host === d || host.endsWith("." + d);
  const linkOk =
    (provider === "BTK Akademi" && on("btkakademi.gov.tr")) ||
    (provider === "Credly" && on("credly.com")) ||
    (provider === "Coursera" && on("coursera.org")) ||
    (provider === "Udemy" && on("udemy.com"));
  if (!linkOk) return { status: "Doğrulanamadı", points: 1 };
  if (nameOnCert && norm(nameOnCert) !== norm(profileName)) return { status: "İsim uyuşmuyor", points: 0 };
  return { status: "Doğrulandı", points: known ? 4 : 3 };
}

// ---------- Referans ----------

const PERSONAL = /@(gmail|hotmail|outlook|yahoo|icloud|yandex|protonmail|live|msn|aol|mail)\./i;
export const isCorporateEmail = (email: string) => !PERSONAL.test(email);
/** Kurumsal e-posta tam, kişisel e-posta düşük ağırlık; yorum yazılırsa +1. */
export const referencePoints = (email: string, hasComment: boolean) => (isCorporateEmail(email) ? 5 : 2) + (hasComment ? 1 : 0);

// ---------- Toplam puan ----------

export interface CompetitionResult {
  id: string;
  code: string;
  title: string;
  rank?: number | null;
}

export interface ScoreInput {
  projects: { analysis: ProjectAnalysis }[];
  certs: { points: number }[];
  references: { status: Reference["status"]; points: number }[];
  peerReceived: { stars: number; competitionId?: string }[];
  completedCompetitions: CompetitionResult[];
  roadmapDonePoints: number;
}

export function competitionPoints(results: CompetitionResult[]) {
  let pts = 0;
  const items: { label: string; points: number; id: string }[] = [];
  for (const c of results) {
    const bonus = c.rank === 1 ? 8 : c.rank === 2 ? 6 : c.rank === 3 ? 4 : 0;
    pts += 4 + bonus;
    items.push({ id: c.id, label: `${c.code} ${c.title}${c.rank && c.rank <= 3 ? ` · ${c.rank}. takım` : " · katılım"}`, points: 4 + bonus });
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
  const raw: Record<ScoreSource, number> = {
    Projeler: s.projects.reduce((a, p) => a + p.analysis.points, 0),
    Yarışmalar: competitionPoints(s.completedCompetitions).points,
    "Akran puanı": peerPoints(s.peerReceived),
    Sertifikalar: s.certs.reduce((a, c) => a + c.points, 0),
    Referanslar: s.references.filter((r) => r.status === "Onaylandı").reduce((a, r) => a + r.points, 0),
    "Yol haritası": s.roadmapDonePoints,
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

// ---------- Profil doluluğu ve yol haritası ----------

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

/** Adımın puanı ve kısayolu kural tablosundan gelir; AI sadece başlık ve açıklama önerir. */
export const STEP_RULES: Record<RoadmapCheck, { points: number; action: { label: string; href: string } }> = {
  project_any: { points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  project_tests: { points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  project_hard: { points: 2, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  apply_competition: { points: 2, action: { label: "Yarışmalar", href: "/yarismalar" } },
  certificate: { points: 1, action: { label: "Sertifika ekle", href: "/profil?sertifika=1" } },
  reference: { points: 2, action: { label: "Onay iste", href: "/profil?onay=1" } },
  peer_rating: { points: 1, action: { label: "Yarışmalar", href: "/yarismalar" } },
  about: { points: 1, action: { label: "Profili düzenle", href: "/profil?duzenle=1" } },
};
export const ROADMAP_CHECKS = Object.keys(STEP_RULES) as RoadmapCheck[];

export const TARGET_SKILLS: Record<Field, string[]> = {
  Frontend: ["React", "TypeScript", "Erişilebilirlik", "Next.js"],
  Backend: ["Node.js", "PostgreSQL", "Docker", "Redis"],
  Veritabanı: ["SQL", "PostgreSQL", "İndeksleme", "Yedekleme"],
  Mobil: ["Flutter", "Kotlin", "Swift", "Çevrimdışı veri"],
  DevOps: ["Docker", "Kubernetes", "CI/CD", "Gözlemlenebilirlik"],
};

export function roadmapBaseline(ctx: RoadmapContext): Roadmap["baseline"] {
  return {
    projects: ctx.projects.length,
    testedProjects: ctx.projects.filter((p) => p.analysis.checks.tests).length,
    hardProjects: ctx.projects.filter((p) => p.analysis.difficulty === "Zor").length,
    applications: Object.keys(ctx.applications).length,
    certs: ctx.certs.filter((c) => c.status === "Doğrulandı").length,
    references: ctx.references.filter((r) => r.status === "Onaylandı").length,
    peerGiven: ctx.peerGivenCount,
  };
}

/** Kural tabanlı yol haritası. Gemini çalışmazsa ya da çıktısı geçersizse bu kullanılır. */
export function generateRoadmap(ctx: RoadmapContext, target: Field, openComp: { id: string; code: string; title: string } | null): Omit<Roadmap, "generatedAt"> {
  const { profile, projects, certs, references } = ctx;
  const base = roadmapBaseline(ctx);
  const missing = TARGET_SKILLS[target].filter((s) => !profile.skills.some((k) => k.name.toLowerCase() === s.toLowerCase() && k.proof !== "Beyan"));

  const steps: RoadmapStep[] = [];
  const add = (check: RoadmapCheck, title: string, detail: string, href?: string) =>
    steps.push({ id: `s-${steps.length + 1}`, title, detail, check, points: STEP_RULES[check].points, action: href ? { ...STEP_RULES[check].action, href } : STEP_RULES[check].action });

  if (missing.length) add("project_any", `${missing[0]} kullanan bir ${target} projesi ekle`, `${target} hedefin için ${missing[0]} kanıtı eksik. Küçük ama bitmiş bir proje yeter.`);
  if (base.testedProjects <= base.hardProjects || base.testedProjects < 2)
    add("project_tests", "Testleri olan bir proje ekle", "Projelerinin çoğunda test yok. Testli bir proje, kalite puanını doğrudan artırır.");
  if (openComp) add("apply_competition", `${openComp.code} ${openComp.title} yarışmasında ${target} pozisyonuna başvur`, "Takımla yapılan iş hem yarışma hem akran puanı getirir.", `/yarismalar/${openComp.id}`);
  if (references.filter((r) => r.status === "Onaylandı").length < 2)
    add("reference", "Staj amirinden ya da hocandan onay al", "Kurumsal e-postadan gelen bir onay, deneyimini kanıtlı hale getirir.");
  if (certs.filter((c) => c.status === "Doğrulandı").length < 3) add("certificate", `${target} alanında doğrulanabilir bir sertifika ekle`, "BTK Akademi ya da Credly sertifikaları otomatik doğrulanır.");
  if (projects.filter((p) => p.analysis.difficulty === "Zor").length < 2)
    add("project_hard", "Zor seviyesinde bir proje bitir", "Birden fazla servis, kuyruk ya da gerçek zamanlı bir özellik projeyi zor seviyesine taşır.");
  if (profile.about.length < 120) add("about", "Hakkında bölümünü genişlet", "Ne üzerinde çalışmayı sevdiğini iki üç cümleyle anlat.");
  add("peer_rating", "Bitirdiğin bir yarışmada takım arkadaşlarını puanla", "Akran puanı karşılıklı işler; sen de puan verdiğinde sistem daha adil olur.");

  const picked = steps.slice(0, 6);
  const summary =
    `${target} hedefin için en büyük eksik ${missing.length ? missing.slice(0, 2).join(" ve ") + " kanıtı" : "projelerinin kalitesi"}. ` +
    `Aşağıdaki ${picked.length} adım seni yaklaşık ${picked.reduce((a, s) => a + s.points, 0) + 15} puan ileri taşır.`;

  return { target, summary, steps: picked, baseline: base };
}
