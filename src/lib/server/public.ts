import "server-only";

import { cache } from "react";
import type { ProfileData } from "@/components/profile-view";
import { COMPETITION_MAX, type LeagueRow } from "@/lib/score";
import type { Badge, Competition, CompetitionPosition, CompetitionSpec, CredentialItem, Difficulty, Field, Level, SpecTest, Team, TeamResult } from "@/lib/types";
import { db } from "./admin";
import { historyDetail } from "./me";
import { APPROVAL_COLS, PROFILE_COLS, PROJECT_COLS, toCert, toExperience, toProject, toReference, type ApprovalRow, type CertRow, type ExperienceRow, type ProfileRow, type ProjectRow } from "./rows";
import { rankFor } from "./season";

// Herkese açık veriler. Sadece gösterilmesi uygun alanlar döner (e-posta, token, doğrulama kodu dönmez).

const USERNAME = /^[a-z0-9_-]{3,30}$/;

/** Lig: kalıcı lig + sezon puanı. Askıdaki kullanıcılar görünmez. Eşitlikte o puana önce ulaşan öne. */
export const loadLeague = cache(async (): Promise<LeagueRow[]> => {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [profiles, recent] = await Promise.all([
    db()
      .from("profiles")
      .select("id, username, name, school, city, field, league, season_points, season_points_at, score")
      .eq("suspended", false)
      .order("season_points", { ascending: false })
      .order("season_points_at", { ascending: true, nullsFirst: false })
      .limit(1000),
    db().from("score_events").select("user_id, points").gte("created_at", since),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  const trend = new Map<string, number>();
  for (const e of (recent.data ?? []) as { user_id: string; points: number }[]) trend.set(e.user_id, (trend.get(e.user_id) ?? 0) + e.points);
  return (profiles.data as { id: string; username: string; name: string; school: string; city: string; field: Field; league: Level; season_points: number; score: number }[]).map((p) => ({
    username: p.username,
    name: p.name,
    school: p.school,
    city: p.city,
    field: p.field,
    league: p.league,
    score: p.season_points,
    total: p.score,
    trend: trend.get(p.id) ?? 0,
  }));
});

type Member = { team_id: string; user_id: string; field: Field; competition_id: string };

interface CompDbRow {
  id: string;
  code: string;
  title: string;
  tagline: string;
  theme: string;
  status: Competition["status"];
  description: string;
  brief: string[];
  deliverables: string[];
  positions: { field: Field; perTeam: number }[];
  apply_deadline: string;
  start_date: string;
  end_date: string;
  difficulty: Difficulty;
  spec: Partial<CompetitionSpec> & { hiddenCount?: number };
  tests: SpecTest[] | null;
  is_demo: boolean;
  calibration: string | null;
  cancel_reason: string | null;
}

interface ResultRow {
  team_id: string;
  hidden_passed: number;
  hidden_total: number;
  tests: TeamResult["tests"];
  correctness: number;
  quality: number;
  teamwork: number;
  coverage: number;
  points: number;
  eliminated: string | null;
  details: TeamResult["details"];
}

interface TeamDbRow {
  id: string;
  competition_id: string;
  name: string;
  repo_url: string | null;
  demo_url: string | null;
  submitted_at: string | null;
  public_run: Omit<NonNullable<Team["publicRun"]>, "at"> | null;
  public_run_at: string | null;
}

/** Herkese açık yarışmalar. Taslak ve sıradakiler görünmez (onlar sadece yönetici sayfasında). */
async function competitionsWhere(ids?: string[]): Promise<Competition[]> {
  let q = db().from("competitions").select("*").not("status", "in", "(Taslak,Sırada)").order("apply_deadline", { ascending: false });
  if (ids) q = q.in("id", ids);
  const comps = await q;
  if (comps.error) throw new Error(comps.error.message);
  const rows = comps.data as CompDbRow[];
  if (!rows.length) return [];
  const cids = rows.map((c) => c.id);
  const [teams, members, apps, results] = await Promise.all([
    db().from("teams").select("id, competition_id, name, repo_url, demo_url, submitted_at, public_run, public_run_at").in("competition_id", cids),
    db().from("team_members").select("team_id, user_id, field, competition_id, points").in("competition_id", cids),
    db().from("applications").select("competition_id, field").in("competition_id", cids),
    db().from("competition_results").select("*").in("competition_id", cids),
  ]);
  const memberRows = (members.data ?? []) as (Member & { points: number })[];
  const people = memberRows.length
    ? (((await db().from("profiles").select("id, username, name").in("id", [...new Set(memberRows.map((m) => m.user_id))])).data ?? []) as { id: string; username: string; name: string }[])
    : [];
  const person = new Map(people.map((p) => [p.id, p]));
  const appRows = (apps.data ?? []) as { competition_id: string; field: Field }[];
  const resultRows = new Map(((results.data ?? []) as ResultRow[]).map((r) => [r.team_id, r]));

  return rows.map((c): Competition => {
    const done = c.status === "Tamamlandı";
    const spec = c.spec?.problem ? (c.spec as CompetitionSpec) : null;
    const hidden = c.spec?.hiddenCount ?? 0;
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      tagline: c.tagline,
      theme: c.theme,
      status: c.status,
      description: c.description,
      brief: c.brief,
      deliverables: c.deliverables,
      positions: c.positions.map(
        (p): CompetitionPosition => ({ field: p.field, perTeam: p.perTeam, applicants: appRows.filter((a) => a.competition_id === c.id && a.field === p.field).length }),
      ),
      applyDeadline: c.apply_deadline,
      start: c.start_date,
      end: c.end_date,
      difficulty: c.difficulty,
      maxPoints: COMPETITION_MAX[c.difficulty],
      spec: spec ? { problem: spec.problem, stories: spec.stories, api: spec.api, testIds: spec.testIds, rules: spec.rules } : null,
      // Gizli testlerin sadece sayısı; adları sonuçla birlikte (karnede) görünür.
      tests: [...(c.tests ?? []), ...Array.from({ length: hidden }, (_, i): SpecTest => ({ id: `G${i + 1}`, title: "Gizli test", public: false }))],
      isDemo: c.is_demo,
      calibration: c.calibration ?? undefined,
      cancelReason: c.cancel_reason ?? undefined,
      teams: ((teams.data ?? []) as TeamDbRow[])
        .filter((t) => t.competition_id === c.id)
        .map((t): Team => {
          const r = done ? resultRows.get(t.id) : undefined;
          return {
            id: t.id,
            competitionId: c.id,
            name: t.name,
            repoUrl: t.repo_url ?? undefined,
            demoUrl: t.demo_url && t.demo_url.startsWith("https://") ? t.demo_url : undefined,
            submitted: !!t.submitted_at,
            publicRun: t.public_run && t.public_run_at ? { ...t.public_run, at: t.public_run_at } : undefined,
            result: r
              ? {
                  hiddenPassed: r.hidden_passed,
                  hiddenTotal: r.hidden_total,
                  tests: r.tests,
                  correctness: r.correctness,
                  quality: r.quality,
                  teamwork: r.teamwork,
                  coverage: r.coverage,
                  points: r.points,
                  eliminated: r.eliminated ?? undefined,
                  details: { lighthouse: r.details?.lighthouse, lintErrors: r.details?.lintErrors, auditHigh: r.details?.auditHigh, ci: r.details?.ci },
                }
              : undefined,
            members: memberRows
              .filter((m) => m.team_id === t.id)
              .map((m) => ({
                username: person.get(m.user_id)?.username ?? "silinmis",
                name: person.get(m.user_id)?.name ?? "Silinmiş kullanıcı",
                field: m.field,
                points: done ? m.points : undefined,
              })),
          };
        })
        .sort((a, b) => (b.result?.coverage ?? -1) - (a.result?.coverage ?? -1) || a.name.localeCompare(b.name, "tr")),
    };
  });
}

export const loadCompetitions = cache(() => competitionsWhere());

export const loadCompetition = cache(async (id: string) => {
  if (!/^y-[0-9]{2,4}$/.test(id)) return null;
  return (await competitionsWhere([id]))[0] ?? null;
});

export async function loadTeam(teamId: string) {
  if (!/^t-[A-Za-z0-9-]{2,40}$/.test(teamId)) return null;
  const t = await db().from("teams").select("competition_id").eq("id", teamId).maybeSingle();
  if (!t.data) return null;
  const c = await loadCompetition((t.data as { competition_id: string }).competition_id);
  const team = c?.teams.find((x) => x.id === teamId);
  return c && team ? { competition: c, team } : null;
}

/** Herkese açık profil (ve CV). Sadece onaylanmış referanslar, e-postanın sadece alan adıyla. */
export const loadPublicProfile = cache(async (username: string): Promise<(ProfileData & { cvCode: string }) | null> => {
  if (!USERNAME.test(username)) return null;
  const pr = await db().from("profiles").select(PROFILE_COLS).eq("username", username).maybeSingle();
  if (!pr.data || (pr.data as ProfileRow).suspended) return null;
  const p = pr.data as ProfileRow;
  const [exps, projects, certs, approvals, conns, members, badges, creds] = await Promise.all([
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", p.id).order("created_at", { ascending: false }),
    db().from("projects").select(PROJECT_COLS).eq("user_id", p.id).order("created_at", { ascending: false }),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", p.id).order("issued_on", { ascending: false }),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", p.id).eq("status", "Onaylandı"),
    db().from("connections").select("other_id").eq("user_id", p.id).limit(12),
    db().from("team_members").select("team_id, competition_id, field, points").eq("user_id", p.id),
    db().from("badges").select("kind, label, created_at").eq("user_id", p.id).order("created_at", { ascending: false }),
    db().from("credentials").select("id, kind, title, status, url").eq("user_id", p.id).eq("status", "Gönderildi"),
  ]);
  const connIds = ((conns.data ?? []) as { other_id: string }[]).map((c) => c.other_id);
  const mem = (members.data ?? []) as { team_id: string; competition_id: string; field: Field; points: number }[];
  const [connPeople, comps] = await Promise.all([
    connIds.length ? db().from("profiles").select("username, name, field").in("id", connIds).eq("suspended", false) : Promise.resolve({ data: [] }),
    mem.length ? db().from("competitions").select("id, code, title, status").in("id", mem.map((m) => m.competition_id)) : Promise.resolve({ data: [] }),
  ]);

  return {
    username: p.username,
    name: p.name,
    headline: p.headline,
    field: p.field,
    school: p.school,
    department: p.department,
    city: p.city,
    github: p.github,
    about: p.about,
    projects: ((projects.data ?? []) as ProjectRow[]).map(toProject).filter((x) => x.status === "hazır").map((x) => ({
      id: x.id,
      name: x.name,
      techs: x.techs,
      description: x.description,
      difficulty: x.analysis.difficulty,
      quality: x.analysis.quality,
      points: x.analysis.points,
      repoUrl: x.repoUrl,
    })),
    experiences: ((exps.data ?? []) as ExperienceRow[]).map(toExperience),
    references: ((approvals.data ?? []) as ApprovalRow[]).map((r) => toReference(r, true)),
    certs: ((certs.data ?? []) as CertRow[]).map(toCert),
    competitions: ((comps.data ?? []) as { id: string; code: string; title: string; status: string }[]).map((c) => {
      const m = mem.find((x) => x.competition_id === c.id)!;
      return { id: c.id, label: `${c.code} ${c.title}`, detail: historyDetail(c.status, m.field, m.points) };
    }),
    education: p.education ?? [],
    skills: p.skills ?? [],
    interests: p.interests ?? [],
    connections: (connPeople.data ?? []) as { username: string; name: string; field: string }[],
    score: p.season_points,
    total: p.score,
    level: p.league,
    rank: await rankFor(p.league, p.season_points, p.season_points_at),
    badges: ((badges.data ?? []) as { kind: Badge["kind"]; label: string; created_at: string }[]).map((b) => ({ kind: b.kind, label: b.label, at: b.created_at })),
    credentials: ((creds.data ?? []) as { id: string; kind: CredentialItem["kind"]; title: string; status: CredentialItem["status"]; url: string | null }[]).map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      status: c.status,
      url: c.url ?? undefined,
    })),
    cvCode: p.cv_code,
  };
});

export async function usernameByCvCode(code: string) {
  if (!/^TLT-[A-Z0-9]{10}$/.test(code)) return null;
  const r = await db().from("profiles").select("username").eq("cv_code", code).maybeSingle();
  return (r.data as { username: string } | null)?.username ?? null;
}
