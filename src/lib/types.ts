export type Field = "Frontend" | "Backend" | "Veritabanı" | "Mobil" | "DevOps";
export const FIELDS: Field[] = ["Frontend", "Backend", "Veritabanı", "Mobil", "DevOps"];

export type Level = "Yeni başlayan" | "Orta" | "Kıdemli";
export const LEVELS: Level[] = ["Yeni başlayan", "Orta", "Kıdemli"];

export type Difficulty = "Kolay" | "Orta" | "Zor";
export type Quality = "Zayıf" | "İyi" | "Çok iyi";

/** Kural tabanlı proje analizi sonucu (bkz. kararlar.md Bölüm 5). */
export interface ProjectAnalysis {
  difficulty: Difficulty;
  quality: Quality;
  authorship: number; // commit yazarlığı yüzdesi
  commits: number;
  checks: { readme: boolean; tests: boolean; ci: boolean; demo: boolean };
  points: number;
  summary: string;
}

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

export type CompetitionStatus = "Başvurular açık" | "Devam ediyor" | "Tamamlandı";

export interface TeamMember {
  username: string;
  name: string;
  field: Field;
}

export interface Team {
  id: string;
  competitionId: string;
  name: string;
  members: TeamMember[];
  repoUrl?: string;
  submitted?: boolean;
  rank?: number;
  juryScore?: number;
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
