export type Field = "Frontend" | "Backend" | "Veritabanı" | "Mobil" | "DevOps";
export const FIELDS: Field[] = ["Frontend", "Backend", "Veritabanı", "Mobil", "DevOps"];

export type Level = "Yeni başlayan" | "Orta" | "Kıdemli";
export const LEVELS: Level[] = ["Yeni başlayan", "Orta", "Kıdemli"];

export type Difficulty = "Kolay" | "Orta" | "Zor";
export type Quality = "Zayıf" | "İyi" | "Çok iyi";

/** AI'ın zorluk gerekçesi: özellik ve onu kanıtlayan dosya (sunucu dosyanın repoda olduğunu kontrol eder). */
export interface DifficultyReason {
  feature: string;
  file: string;
}

/** Proje değerlendirmesi (kararlar.md Bölüm 5, "Proje değerlendirmesi"). Zorluğu AI sınıflandırır, puanı kural verir. */
export interface ProjectAnalysis {
  difficulty: Difficulty;
  quality: Quality;
  /** Kalite puanı (sadece Orta ve Zor'da sayılır, en fazla 30) */
  qualityPoints: number;
  authorship: number; // commit yazarlığı yüzdesi
  commits: number;
  /** Kullanıcının commit attığı farklı gün sayısı */
  commitDays: number;
  /** Şablon dışı, kendine ait kaynak dosyası sayısı */
  ownFiles: number;
  /** İlk commit'le gelip hiç değişmeyen kodun oranı (0–1) */
  importedRatio: number;
  checks: { readme: boolean; tests: boolean; ci: boolean; demo: boolean; days: boolean };
  points: number;
  summary: string;
  reasons: DifficultyReason[];
  commitSha?: string;
}

export type ProjectStatus = "hazır" | "analiz bekliyor";

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  description: string;
  techs: string[];
  role: "Tek başıma" | "Takımla";
  language: string;
  demoUrl?: string;
  addedAt: string;
  status: ProjectStatus;
  analysis: ProjectAnalysis;
}

export type CertProvider = "BTK Akademi" | "Credly" | "Coursera" | "Udemy" | "Diğer";
export type CertStatus = "Doğrulandı" | "İsim uyuşmuyor" | "Doğrulanamadı";

export interface Certificate {
  id: string;
  name: string;
  provider: CertProvider;
  link: string;
  date: string;
  status: CertStatus;
  points: number;
}

export type ExperienceKind = "Staj" | "İş" | "Gönüllü";
export interface Experience {
  id: string;
  kind: ExperienceKind;
  title: string;
  org: string;
  start: string;
  end: string;
  description?: string;
}

export type Relation = "Staj amiri" | "Hoca" | "İşveren" | "Takım arkadaşı";
export type ReferenceStatus = "Bekliyor" | "Onaylandı" | "Reddedildi";

/** Amir/hoca onayı. Hedef bir deneyim ya da proje olabilir. */
export interface Reference {
  token: string;
  targetType: "experience" | "project";
  targetId: string;
  targetLabel: string;
  approverName: string;
  approverEmail: string;
  relation: Relation;
  status: ReferenceStatus;
  comment?: string;
  requestedAt: string;
  answeredAt?: string;
  points: number;
}

export interface Education {
  school: string;
  department: string;
  start: string;
  end: string;
}

export interface Skill {
  name: string;
  /** Kanıt: kod, onay ya da yarışma; yoksa beyan */
  proof: "Kod" | "Onay" | "Yarışma" | "Sertifika" | "Beyan";
}

export interface Profile {
  username: string;
  name: string;
  email: string;
  headline: string;
  field: Field | "";
  school: string;
  department: string;
  city: string;
  github: string;
  /** GitHub kullanıcı adının bu kişiye ait olduğu bio'daki kodla doğrulandı mı */
  githubVerified: boolean;
  /** Doğrulama için GitHub bio'ya yazılacak kod */
  githubCode: string;
  about: string;
  interests: string[];
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  connections: string[]; // kullanıcı adları
}

export interface CompetitionPosition {
  field: Field;
  perTeam: number;
  applicants: number;
}

export type CompetitionStatus = "Taslak" | "Sırada" | "Başvurular açık" | "Devam ediyor" | "Değerlendiriliyor" | "Tamamlandı" | "İptal";

/** Şartnamenin sabit arayüzü: gizli testler takımın demosunu dışarıdan denediği için herkes aynı uçları sunar. */
export interface SpecEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  request?: string;
  response: string;
  note?: string;
}

export interface SpecTestId {
  page: string;
  id: string;
  note: string;
}

export interface CompetitionSpec {
  problem: string;
  stories: string[];
  api: SpecEndpoint[];
  testIds: SpecTestId[];
  rules: string[];
}

export interface SpecTest {
  id: string;
  title: string;
  public: boolean;
}

export interface TeamResult {
  hiddenPassed: number;
  hiddenTotal: number;
  tests: { id: string; title: string; passed: boolean; public: boolean }[];
  correctness: number;
  quality: number;
  teamwork: number;
  coverage: number;
  points: number;
  eliminated?: string;
  details: {
    lighthouse?: { accessibility: number; performance: number; mobile: number };
    lintErrors?: number;
    auditHigh?: number;
    ci?: boolean;
    contributions?: Record<string, number>;
  };
}

export interface TeamMember {
  username: string;
  name: string;
  field: Field;
  /** Yarışma tamamlandıysa kişisel puan */
  points?: number;
}

export interface Team {
  id: string;
  competitionId: string;
  name: string;
  members: TeamMember[];
  repoUrl?: string;
  demoUrl?: string;
  submitted?: boolean;
  result?: TeamResult;
  /** Açık testlerin son deneme sonucu */
  publicRun?: { passed: number; total: number; at: string; tests: { title: string; passed: boolean }[] };
}

export interface Competition {
  id: string;
  code: string;
  title: string;
  tagline: string;
  theme: string;
  status: CompetitionStatus;
  description: string;
  brief: string[];
  deliverables: string[];
  positions: CompetitionPosition[];
  applyDeadline: string;
  start: string;
  end: string;
  difficulty: Difficulty;
  maxPoints: number;
  spec: CompetitionSpec | null;
  tests: SpecTest[];
  isDemo: boolean;
  calibration?: string;
  cancelReason?: string;
  teams: Team[];
}

export interface Message {
  id: string;
  from: string; // kullanıcı adı, "me" = oturum sahibi
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  with: string; // kullanıcı adı
  messages: Message[];
}

export interface RoadmapStep {
  id: string;
  title: string;
  detail: string;
  points: number;
  action: { label: string; href: string };
  /** Otomatik tamamlanma koşulu anahtarı */
  check: RoadmapCheck;
}

export type RoadmapCheck =
  | "project_any"
  | "project_tests"
  | "project_hard"
  | "apply_competition"
  | "certificate"
  | "reference"
  | "peer_rating"
  | "about";

export interface Roadmap {
  target: Field;
  generatedAt: string;
  summary: string;
  steps: RoadmapStep[];
  /** Oluşturulduğu andaki sayılar; adım tamamlanması bunlara göre ölçülür */
  baseline: {
    projects: number;
    testedProjects: number;
    hardProjects: number;
    applications: number;
    certs: number;
    references: number;
    peerGiven: number;
  };
}

export interface ScoreEvent {
  id: string;
  at: string;
  source: ScoreSource;
  label: string;
  points: number;
  seasonId?: number;
}

export type ScoreSource = "Projeler" | "Yarışmalar" | "Akran puanı" | "Sertifikalar" | "Referanslar" | "Yol haritası";

export interface Notification {
  id: string;
  text: string;
  href: string;
  at: string;
  read: boolean;
}

/** Ligde ve herkese açık profillerde görünen diğer yazılımcılar */
export interface PublicUser {
  username: string;
  name: string;
  school: string;
  city: string;
  field: Field;
  score: number;
  trend: number;
  github: string;
  about: string;
  skills: string[];
  interests: string[];
  projects: { name: string; techs: string[]; difficulty: Difficulty; description: string }[];
}

// ---------- Oturum sahibinin sunucudan gelen durumu ----------

export interface SeasonInfo {
  id: number;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface MeScore {
  /** Tüm zamanların toplamı */
  total: number;
  /** Bu sezonun puanı = lig puanı */
  season: number;
  /** Kalıcı lig (sezon sonunda değişir) */
  level: Level;
  /** Bu sezon kaynak kaynak */
  parts: { source: ScoreSource; points: number }[];
  /** Tüm zamanlar kaynak kaynak */
  allParts: { source: ScoreSource; points: number }[];
  rank: { rank: number; of: number };
  roadmapDone: string[];
}

export interface Badge {
  kind: "Sezon şampiyonu" | "Mentor";
  label: string;
  at: string;
}

export interface CredentialItem {
  id: string;
  kind: "Yarışma" | "Sezon şampiyonu";
  title: string;
  status: "Beklemede" | "Gönderildi";
  url?: string;
}

export interface PersonRef {
  username: string;
  name: string;
  field: string;
}

export interface CompetitionHistoryItem {
  id: string;
  label: string;
  detail: string;
}

export interface ChatLine {
  id: string;
  from: string; // kullanıcı adı, "me" = oturum sahibi
  text: string;
  at: string;
}

export interface MeData {
  session: { username: string } | null;
  profile: Profile | null;
  projects: Project[];
  certs: Certificate[];
  references: Reference[];
  peerReceived: { from: string; competitionId: string; stars: number; note?: string }[];
  peerGiven: Record<string, Record<string, number>>;
  history: ScoreEvent[];
  applications: Record<string, Field>;
  roadmap: Roadmap | null;
  conversations: Conversation[];
  teamChats: Record<string, ChatLine[]>;
  notifications: Notification[];
  score: MeScore;
  people: Record<string, PersonRef>;
  competitionHistory: CompetitionHistoryItem[];
  season: SeasonInfo | null;
  badges: Badge[];
  credentials: CredentialItem[];
  /** Kapanan sezonda lig değiştiyse ve henüz gösterilmediyse (konfeti) */
  seasonResult: { seasonName: string; from: Level; to: Level; champion: boolean } | null;
  isAdmin: boolean;
  kvkkAccepted: boolean;
  /** Engellediğin kullanıcı adları */
  blocked: string[];
}

/** Sunucu aksiyonlarının ortak cevabı. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
