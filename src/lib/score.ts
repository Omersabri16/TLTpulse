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
  Quality,
  Reference,
  Roadmap,
  RoadmapCheck,
  RoadmapStep,
  ScoreSource,
} from "./types";

export const SOURCES: ScoreSource[] = ["Projeler", "Yarışmalar", "Akran puanı", "Sertifikalar", "Referanslar", "Yol haritası"];

// ---------- Lig ve sezon (kararlar.md Bölüm 5, "Sezonlu lig") ----------

/** Sezon sonunda her ligin ilk %20'si yükselir, Orta ve Kıdemli'nin son %10'u düşer (SQL: season_moves aynı kural). */
export const PROMOTION_RATE = 0.2;
export const RELEGATION_RATE = 0.1;
/** Ligde n kişi varken yükselen sayısı (yukarı yuvarlanır: az kişili ligde de en az 1 kişi). */
export const promotionCount = (n: number) => Math.ceil(n * PROMOTION_RATE);
/** Düşen sayısı (aşağı yuvarlanır: 10 kişiden az ligde kimse düşmez). */
export const relegationCount = (n: number) => Math.floor(n * RELEGATION_RATE);
/** Yükselmek için sezonda en az bu kadar puan gerekir; bu puanı alan düşmez. */
export const MIN_SEASON_POINTS = 100;

export const levelLabel = (l: Level) => (l === "Yeni başlayan" ? "Yeni başlayan ligi" : `${l} lig`);
export const nextLevel = (l: Level): Level | null => (l === "Yeni başlayan" ? "Orta" : l === "Orta" ? "Kıdemli" : null);
export const levelRank = (l: Level) => (l === "Yeni başlayan" ? 0 : l === "Orta" ? 1 : 2);

/** Basit, deterministik hash (avatar rengi gibi görsel seçimler için; güvenlik için değil). */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// ---------- Proje puanı (kararlar.md Bölüm 5, "Proje değerlendirmesi") ----------

/** Zorluğu AI sınıflandırır; puanı bu tablo verir. Kolay proje sabit 10, kalite sayılmaz. */
export const DIFFICULTY_POINTS: Record<Difficulty, number> = { Kolay: 10, Orta: 40, Zor: 70 };
/** Kalite (sadece Orta ve Zor): CI'da yeşil testler, açılan demo, anlamlı README, 10+ farklı günde geliştirme. */
export const QUALITY_RULES = { ci: 12, demo: 8, readme: 4, days: 6 } as const;
export const MIN_AUTHORSHIP = 10;
/** Şablon dışı kendi kaynak dosyası bundan azsa proje eklenemez (en az 1). */
export const MIN_OWN_FILES = 1;
/** Başka bir projeyle bu oranda ya da fazla aynı dosya varsa kopya sayılır. */
export const COPY_RATIO = 0.5;
/** İlk commit'le gelen kod bu oranı geçerse "içe aktarılmış" sayılır. */
export const IMPORTED_RATIO = 0.6;
export const MIN_COMMIT_DAYS = 10;
export const MIN_README_CHARS = 300;

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export interface ProjectSignals {
  difficulty: Difficulty;
  ci: boolean;
  demo: boolean;
  readme: boolean;
  commitDays: number;
  importedRatio: number;
}

export function qualityPoints(s: Pick<ProjectSignals, "ci" | "demo" | "readme" | "commitDays">) {
  return (s.ci ? QUALITY_RULES.ci : 0) + (s.demo ? QUALITY_RULES.demo : 0) + (s.readme ? QUALITY_RULES.readme : 0) + (s.commitDays >= MIN_COMMIT_DAYS ? QUALITY_RULES.days : 0);
}

export const qualityLabel = (qp: number): Quality => (qp >= 20 ? "Çok iyi" : qp >= 10 ? "İyi" : "Zayıf");

/** İçe aktarılmış kod kuralı sadece Zor projede geçerli (6 Ekim 2026: Kolay ve Orta'da kaldırıldı). */
export const importPenalized = (difficulty: Difficulty, importedRatio: number) => difficulty === "Zor" && importedRatio > IMPORTED_RATIO;

/** 0–100. İçe aktarılmış Zor projede puan, sonradan yazılan kodun oranıyla çarpılır. */
export function projectPoints(s: ProjectSignals) {
  const qp = qualityPoints(s);
  const base = s.difficulty === "Kolay" ? DIFFICULTY_POINTS.Kolay : DIFFICULTY_POINTS[s.difficulty] + qp;
  const factor = importPenalized(s.difficulty, s.importedRatio) ? 1 - s.importedRatio : 1;
  return Math.round(base * factor);
}

// ---------- Yarışma puanı (kararlar.md Bölüm 5, "Yarışma değerlendirmesi") ----------

export const COMPETITION_MAX: Record<Difficulty, number> = { Kolay: 100, Orta: 150, Zor: 200 };
export const COVERAGE_WEIGHTS = { correctness: 0.6, quality: 0.25, teamwork: 0.15 } as const;
/** Karşılama oranı bunun altındaysa puan yok. */
export const MIN_COVERAGE = 0.5;
/** Zorluğa göre takım büyüklüğü ve pozisyonlar. */
export const TEAM_FIELDS: Record<Difficulty, Field[]> = {
  Kolay: ["Frontend", "Backend"],
  Orta: ["Frontend", "Backend", "Veritabanı"],
  Zor: ["Frontend", "Backend", "Veritabanı", "DevOps"],
};

export const coverageOf = (correctness: number, quality: number, teamwork: number) =>
  COVERAGE_WEIGHTS.correctness * correctness + COVERAGE_WEIGHTS.quality * quality + COVERAGE_WEIGHTS.teamwork * teamwork;

export const teamPoints = (difficulty: Difficulty, coverage: number) => (coverage < MIN_COVERAGE ? 0 : Math.round(COMPETITION_MAX[difficulty] * Math.min(1, coverage)));

/** Katkısı takım ortalamasının yarısının altındaysa katkısı oranında azalır; hiç commit'i yoksa 0. */
export function personalPoints(team: number, commits: number, avgCommits: number) {
  if (commits <= 0) return 0;
  if (avgCommits <= 0 || commits >= avgCommits / 2) return team;
  return Math.round(team * (commits / avgCommits));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Takım çalışması (0–1): üyelerin katkısı dengeli mi (en az / en çok commit), commit'ler süreye yayılmış mı (hepsi son gece değil). */
export function teamworkScore(memberCommits: number[], commitDays: number, lastTwoDaysShare: number) {
  if (!memberCommits.length || Math.max(...memberCommits) === 0) return 0;
  const balance = Math.min(...memberCommits) / Math.max(...memberCommits);
  const spread = Math.min(1, commitDays / 7) * (lastTwoDaysShare > 0.8 ? 0.5 : 1);
  return r2(0.6 * balance + 0.4 * spread);
}

/** Kalite (0–1): Lighthouse (erişilebilirlik, performans, mobil) %50, lint %20, npm audit %15, CI yeşil %15. Ölçülemeyen yarım puan. */
export function qualityScore(q: { lighthouse?: { accessibility: number; performance: number; mobile: number } | null; lintErrors?: number | null; auditHigh?: number | null; ci?: boolean }) {
  const lh = q.lighthouse ? (q.lighthouse.accessibility + q.lighthouse.performance + q.lighthouse.mobile) / 3 : 0;
  const lint = q.lintErrors == null ? 0.5 : Math.max(0, 1 - q.lintErrors / 50);
  const audit = q.auditHigh == null ? 0.5 : q.auditHigh === 0 ? 1 : Math.max(0, 1 - q.auditHigh / 5);
  return r2(0.5 * lh + 0.2 * lint + 0.15 * audit + 0.15 * (q.ci ? 1 : 0));
}

/** Kalibrasyon: biten yarışmanın ortalama karşılama oranı. */
export const calibrationOf = (avgCoverage: number) => (avgCoverage > 0.9 ? "Fazla kolay" : avgCoverage < 0.4 ? "Fazla zor" : "Dengeli");

/**
 * Takım kurma: her pozisyonun (güçlüden zayıfa sıralı) başvuranları takımlara yılan sırasıyla dağıtılır; 1. takım bir
 * pozisyonda en güçlüyü alırsa sonraki pozisyonda en zayıfı alır. Takım sayısı = en az başvurulan pozisyonun sayısı.
 */
export function snakeDraft<T>(byField: T[][]): { teams: T[][]; substitutes: T[] } {
  const n = byField.length ? Math.min(...byField.map((x) => x.length)) : 0;
  const teams: T[][] = Array.from({ length: n }, () => []);
  byField.forEach((sorted, k) => {
    const order = k % 2 === 0 ? [...Array(n).keys()] : [...Array(n).keys()].reverse();
    order.forEach((teamIdx, i) => teams[teamIdx].push(sorted[i]));
  });
  return { teams, substitutes: byField.flatMap((sorted) => sorted.slice(n)) };
}

// ---------- Akran ve mentor puanı ----------

const PEER_POINTS_PER_COMPETITION = 30;
/** Kararlar.md Bölüm 5, "Mentor puanı" (9 Ekim'de onaylandı): takımındaki Yeni başlayanlardan ortalama 4+ yıldız. */
export const MENTOR_POINTS = 15;
export const MENTOR_MIN_STARS = 4;

/**
 * Bir yarışmada mentor puanı hak edildi mi? Ligler yarışma anındaki (takıma girildiğindeki) lig: sonradan puanlayan
 * yükselse ya da mentor düşse de kazanılan puan değişmez.
 */
export function mentorEarned(myLeague: Level, ratings: { stars: number; fromLeague: Level }[]) {
  if (myLeague === "Yeni başlayan") return false;
  const fromNew = ratings.filter((r) => r.fromLeague === "Yeni başlayan");
  return fromNew.length > 0 && fromNew.reduce((a, r) => a + r.stars, 0) / fromNew.length >= MENTOR_MIN_STARS;
}

// ---------- Sertifika doğrulama ----------

/**
 * Kaynaktan doğrulanan BTK / Credly 20; diğerleri beyan 5, bir kişi (hoca, amir) onaylarsa 20; isim uyuşmayan 0
 * (kararlar.md Bölüm 5 ve 6). Doğrulama sunucuda: lib/server/cert-verify.ts.
 */
export const CERT_POINTS = { verified: 20, approved: 20, declared: 5 } as const;
export const SOURCE_CHECKED: CertProvider[] = ["BTK Akademi", "Credly"];
/** Eski kayıtlardaki "Doğrulanamadı" arayüzde "Beyan" gibi davranır. */
export const isDeclared = (s: CertStatus) => s === "Beyan" || s === "Doğrulanamadı";

const normName = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Profildeki ismin her kelimesi kaynaktaki metinde ayrı kelime olarak geçiyor mu (Türkçe karakter ve büyük harf fark etmez; ikinci ad engel olmaz). */
export function nameMatches(profileName: string, sourceText: string) {
  const want = normName(profileName).split(" ").filter((w) => w.length >= 2);
  if (!want.length) return false;
  const have = new Set(normName(sourceText).split(" "));
  return want.every((w) => have.has(w));
}

const hostOn = (u: URL, d: string) => u.hostname.toLowerCase() === d || u.hostname.toLowerCase().endsWith("." + d);
const parse = (link: string) => {
  try {
    return new URL(link.trim());
  } catch {
    return null;
  }
};

/** btkakademi.gov.tr/portal/certificate/validate?certificateId=... → numara. */
export function btkCertId(link: string) {
  const u = parse(link);
  if (!u || u.protocol !== "https:" || !hostOn(u, "btkakademi.gov.tr")) return null;
  const id = u.searchParams.get("certificateId") ?? "";
  return /^[A-Za-z0-9_-]{4,100}$/.test(id) ? id : null;
}

/** credly.com/badges/<uuid>[/...] → uuid. */
export function credlyBadgeId(link: string) {
  const u = parse(link);
  if (!u || u.protocol !== "https:" || !hostOn(u, "credly.com")) return null;
  const m = u.pathname.match(/^\/badges\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/i);
  return m ? m[1].toLowerCase() : null;
}

/** Aynı sertifika iki hesaba eklenemesin diye anahtar: BTK ve Credly'de numara, diğerlerinde sadeleştirilmiş link. */
export function certKey(provider: CertProvider, link: string) {
  if (provider === "BTK Akademi") {
    const id = btkCertId(link);
    return id ? `btk:${id}` : null;
  }
  if (provider === "Credly") {
    const id = credlyBadgeId(link);
    return id ? `credly:${id}` : null;
  }
  const u = parse(link);
  if (!u) return null;
  const params = [...u.searchParams].filter(([k]) => !/^utm_/i.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const q = params.length ? "?" + params.map(([k, v]) => `${k}=${v}`).join("&") : "";
  return `link:${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${q}`.slice(0, 320);
}

// ---------- Referans ----------

const PERSONAL = /@(gmail|hotmail|outlook|yahoo|icloud|yandex|protonmail|live|msn|aol|mail)\./i;
export const isCorporateEmail = (email: string) => !PERSONAL.test(email);
/** Kurumsal e-posta 30, kişisel e-posta 10; yorum yazılırsa +5. */
export const referencePoints = (email: string, hasComment: boolean) => (isCorporateEmail(email) ? 30 : 10) + (hasComment ? 5 : 0);

// ---------- Puan defteri ----------

/** Puan veren her kaynak bir kalem. Sunucu her kalemin beklenen puanını defterdeki toplamla karşılaştırıp farkı yazar. */
export interface ScoreItem {
  ref: string;
  source: ScoreSource;
  label: string;
  points: number;
  /** Yol haritası adımı: yol haritası yenilense de kazanılan puan geri alınmaz. */
  sticky?: boolean;
}

/** Bir yarışmadaki yıldızların ortalaması 30 üzerinden. */
export const peerPointsFor = (stars: number[]) => (stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length / 5) * PEER_POINTS_PER_COMPETITION) : 0);

/** Yarışma yarışma akran puanı toplamı. */
export function peerPoints(ratings: { stars: number; competitionId?: string }[]) {
  const by = new Map<string, number[]>();
  for (const r of ratings) by.set(r.competitionId ?? "", [...(by.get(r.competitionId ?? "") ?? []), r.stars]);
  return [...by.values()].reduce((a, s) => a + peerPointsFor(s), 0);
}

export interface ScoreItemsInput {
  projects: { id: string; name: string; points: number; status: string }[];
  certs: { id: string; name: string; provider: string; points: number }[];
  approvals: { id: string; targetId?: string; answeredAt?: string | null; label: string; approverName: string; status: string; points: number }[];
  competitions: { id: string; code: string; title: string; points: number }[];
  peer: { competitionId: string; code: string; stars: number[] }[];
  mentor: { competitionId: string; code: string }[];
  roadmap: { ref: string; label: string; points: number }[];
}

export function scoreItems(i: ScoreItemsInput): ScoreItem[] {
  return [
    ...i.projects.filter((p) => p.status === "hazır").map((p): ScoreItem => ({ ref: `project:${p.id}`, source: "Projeler", label: `${p.name} projesi`, points: p.points })),
    ...i.certs.map((c): ScoreItem => ({ ref: `cert:${c.id}`, source: "Sertifikalar", label: `${c.provider} · ${c.name}`, points: c.points })),
    // Bir deneyim / projeye tek onay puan verir (ilk onaylanan); sonrakiler profilde görünür ama puan getirmez.
    ...i.approvals
      .filter((a) => a.status === "Onaylandı")
      .sort((a, b) => (a.answeredAt ?? "").localeCompare(b.answeredAt ?? ""))
      .filter((a, k, all) => !a.targetId || all.findIndex((x) => x.targetId === a.targetId) === k)
      .map((a): ScoreItem => ({ ref: `approval:${a.id}`, source: "Referanslar", label: `${a.approverName} onayladı: ${a.label}`, points: a.points })),
    ...i.competitions.map((c): ScoreItem => ({ ref: `comp:${c.id}`, source: "Yarışmalar", label: `${c.code} ${c.title}`, points: c.points })),
    ...i.peer.map((p): ScoreItem => ({ ref: `peer:${p.competitionId}`, source: "Akran puanı", label: `${p.code} takım arkadaşlarından`, points: peerPointsFor(p.stars) })),
    ...i.mentor.map((m): ScoreItem => ({ ref: `mentor:${m.competitionId}`, source: "Akran puanı", label: `${m.code} mentor puanı`, points: MENTOR_POINTS })),
    ...i.roadmap.map((r): ScoreItem => ({ ref: r.ref, source: "Yol haritası", label: r.label, points: r.points, sticky: true })),
  ];
}

export function sumBySource(events: { source: ScoreSource; points: number }[]) {
  return SOURCES.map((source) => ({ source, points: events.filter((e) => e.source === source).reduce((a, e) => a + e.points, 0) }));
}

// ---------- Lig ----------

export interface LeagueRow {
  username: string;
  name: string;
  school: string;
  city: string;
  field: Field;
  league: Level;
  /** Sezon puanı (lig sırası buna göre) */
  score: number;
  total: number;
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
  project_any: { points: 10, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  project_tests: { points: 10, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  project_hard: { points: 10, action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  apply_competition: { points: 5, action: { label: "Yarışmalar", href: "/yarismalar" } },
  certificate: { points: 5, action: { label: "Sertifika ekle", href: "/profil?sertifika=1" } },
  reference: { points: 10, action: { label: "Onay iste", href: "/profil?onay=1" } },
  peer_rating: { points: 5, action: { label: "Yarışmalar", href: "/yarismalar" } },
  about: { points: 5, action: { label: "Profili düzenle", href: "/profil?duzenle=1" } },
};
export const ROADMAP_CHECKS = Object.keys(STEP_RULES) as RoadmapCheck[];

export const TARGET_SKILLS: Record<Field, string[]> = {
  Frontend: ["React", "TypeScript", "Erişilebilirlik", "Next.js"],
  Backend: ["Node.js", "PostgreSQL", "Docker", "Redis"],
  "Full Stack": ["React", "Node.js", "PostgreSQL", "TypeScript"],
  Veritabanı: ["SQL", "PostgreSQL", "İndeksleme", "Yedekleme"],
  iOS: ["Swift", "SwiftUI", "Core Data", "XCTest"],
  Android: ["Kotlin", "Jetpack Compose", "Room", "Coroutines"],
  "Cross-Platform": ["Flutter", "Dart", "React Native", "Firebase"],
  "Veri Bilimi": ["Python", "Pandas", "SQL", "İstatistik"],
  "Yapay Zeka": ["Python", "PyTorch", "scikit-learn", "NLP"],
  "Siber Güvenlik": ["OWASP", "Linux", "Ağ güvenliği", "Burp Suite"],
  "Bulut Bilişim": ["AWS", "Azure", "Terraform", "Docker"],
  DevOps: ["Docker", "Kubernetes", "CI/CD", "Gözlemlenebilirlik"],
  "Oyun Geliştirme": ["Unity", "C#", "Unreal Engine", "C++"],
  "Gömülü / IoT": ["C", "C++", "Arduino", "MQTT"],
  "Test / QA": ["Playwright", "Selenium", "Jest", "Test otomasyonu"],
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
    add("project_tests", "Testleri olan bir proje ekle", "Projelerinin çoğunda CI'da çalışan test yok. Testleri CI'da yeşil geçen bir proje kalite puanına +12 ekler.");
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
    `Aşağıdaki ${picked.length} adım tamamlandıkça ${picked.reduce((a, s) => a + s.points, 0)} puan getirir; eklediğin projeler ve yarışmalar ayrıca puan kazandırır.`;

  return { target, summary, steps: picked, baseline: base };
}
