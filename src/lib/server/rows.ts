import "server-only";

import type { Certificate, Education, Experience, Field, Level, Profile, Project, ProjectAnalysis, Reference, Skill } from "@/lib/types";

// Veritabanı satırları (snake_case) ve arayüz tiplerine dönüşümler.

export interface ProfileRow {
  id: string;
  username: string;
  name: string;
  headline: string;
  field: Field | "";
  school: string;
  department: string;
  city: string;
  github: string;
  github_verified: boolean;
  github_code: string;
  about: string;
  interests: string[];
  skills: Skill[];
  education: Education[];
  cv_code: string;
  score: number;
  league: Level;
  season_points: number;
  season_points_at: string | null;
  is_admin: boolean;
  suspended: boolean;
  kvkk_accepted_at: string | null;
  created_at: string;
}

export const PROFILE_COLS =
  "id, username, name, headline, field, school, department, city, github, github_verified, github_code, about, interests, skills, education, cv_code, score, league, season_points, season_points_at, is_admin, suspended, kvkk_accepted_at, created_at";

export interface ExperienceRow {
  id: string;
  kind: Experience["kind"];
  title: string;
  org: string;
  start_label: string;
  end_label: string;
  description: string | null;
}

export const toExperience = (r: ExperienceRow): Experience => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  org: r.org,
  start: r.start_label,
  end: r.end_label,
  description: r.description ?? undefined,
});

export interface ProjectRow {
  id: string;
  name: string;
  repo_owner: string;
  repo_name: string;
  description: string;
  techs: string[];
  role: Project["role"];
  language: string;
  demo_url: string | null;
  analysis: Partial<ProjectAnalysis>;
  points: number;
  status: Project["status"];
  commit_sha: string | null;
  reasons: ProjectAnalysis["reasons"] | null;
  created_at: string;
}

export const PROJECT_COLS = "id, name, repo_owner, repo_name, description, techs, role, language, demo_url, analysis, points, status, commit_sha, reasons, created_at";

/** Eski kayıtlarda olmayan alanlar varsayılanla doldurulur. */
export const toAnalysis = (a: Partial<ProjectAnalysis>, points: number, reasons: ProjectAnalysis["reasons"] | null, sha: string | null): ProjectAnalysis => ({
  difficulty: a.difficulty ?? "Kolay",
  quality: a.quality ?? "Zayıf",
  qualityPoints: a.qualityPoints ?? 0,
  authorship: a.authorship ?? 0,
  commits: a.commits ?? 0,
  commitDays: a.commitDays ?? 0,
  ownFiles: a.ownFiles ?? 0,
  importedRatio: a.importedRatio ?? 0,
  checks: { readme: false, tests: false, ci: false, demo: false, days: false, ...(a.checks ?? {}) },
  points,
  summary: a.summary ?? "",
  reasons: reasons ?? a.reasons ?? [],
  commitSha: sha ?? undefined,
});

export const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  name: r.name,
  repoUrl: `https://github.com/${r.repo_owner}/${r.repo_name}`,
  description: r.description,
  techs: r.techs,
  role: r.role,
  language: r.language,
  demoUrl: r.demo_url ?? undefined,
  addedAt: r.created_at,
  status: r.status ?? "hazır",
  analysis: toAnalysis(r.analysis ?? {}, r.points, r.reasons, r.commit_sha),
});

export interface CertRow {
  id: string;
  name: string;
  provider: Certificate["provider"];
  link: string;
  issued_on: string;
  status: Certificate["status"];
  points: number;
}

export const toCert = (r: CertRow): Certificate => ({ id: r.id, name: r.name, provider: r.provider, link: r.link, date: r.issued_on, status: r.status, points: r.points });

export interface ApprovalRow {
  id: string;
  target_type: Reference["targetType"];
  target_id: string;
  target_label: string;
  approver_name: string;
  approver_email: string;
  relation: Reference["relation"];
  status: Reference["status"];
  comment: string | null;
  requested_at: string;
  answered_at: string | null;
  points: number;
}

export const APPROVAL_COLS = "id, target_type, target_id, target_label, approver_name, approver_email, relation, status, comment, requested_at, answered_at, points";

/** `publicOnly`: onaylayanın e-postasının sadece alan adı gider (KVKK). */
export const toReference = (r: ApprovalRow, publicOnly = false): Reference => ({
  token: r.id,
  targetType: r.target_type,
  targetId: r.target_id,
  targetLabel: r.target_label,
  approverName: r.approver_name,
  approverEmail: publicOnly ? `gizli@${r.approver_email.split("@")[1] ?? ""}` : r.approver_email,
  relation: r.relation,
  status: r.status,
  comment: r.comment ?? undefined,
  requestedAt: r.requested_at,
  answeredAt: r.answered_at ?? undefined,
  points: r.points,
});

export function toProfile(p: ProfileRow, email: string, experiences: Experience[], connections: string[]): Profile {
  return {
    username: p.username,
    name: p.name,
    email,
    headline: p.headline,
    field: p.field,
    school: p.school,
    department: p.department,
    city: p.city,
    github: p.github,
    githubVerified: p.github_verified,
    githubCode: p.github_code,
    about: p.about,
    interests: p.interests ?? [],
    skills: p.skills ?? [],
    experiences,
    education: p.education ?? [],
    connections,
  };
}
