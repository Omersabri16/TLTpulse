import "server-only";

import { cache } from "react";
import type { ProfileData } from "@/components/profile-view";
import { levelOf, type LeagueRow } from "@/lib/score";
import type { Competition, CompetitionPosition, Field, Team } from "@/lib/types";
import { db } from "./admin";
import { rankFor } from "./me";
import { APPROVAL_COLS, PROFILE_COLS, toCert, toExperience, toProject, toReference, type ApprovalRow, type CertRow, type ExperienceRow, type ProfileRow, type ProjectRow } from "./rows";

// Herkese açık veriler. Sadece gösterilmesi uygun alanlar döner (e-posta, token, doğrulama kodu dönmez).

const USERNAME = /^[a-z0-9_-]{3,30}$/;

export const loadLeague = cache(async (): Promise<LeagueRow[]> => {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [profiles, recent] = await Promise.all([
    db().from("profiles").select("id, username, name, school, city, field, score").order("score", { ascending: false }).limit(500),
    db().from("score_events").select("user_id, points").gte("created_at", since),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  const trend = new Map<string, number>();
  for (const e of (recent.data ?? []) as { user_id: string; points: number }[]) trend.set(e.user_id, (trend.get(e.user_id) ?? 0) + e.points);
  return (profiles.data as { id: string; username: string; name: string; school: string; city: string; field: Field; score: number }[]).map((p) => ({
    username: p.username,
    name: p.name,
    school: p.school,
    city: p.city,
    field: p.field,
    score: p.score,
    trend: trend.get(p.id) ?? 0,
  }));
});

type Member = { team_id: string; user_id: string; field: Field; competition_id: string };

async function competitionsWhere(ids?: string[]): Promise<Competition[]> {
  let q = db().from("competitions").select("*").order("apply_deadline", { ascending: false });
  if (ids) q = q.in("id", ids);
  const comps = await q;
  if (comps.error) throw new Error(comps.error.message);
  const rows = comps.data as {
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
  }[];
  if (!rows.length) return [];
  const cids = rows.map((c) => c.id);
  const [teams, members, apps] = await Promise.all([
    db().from("teams").select("id, competition_id, name, repo_url, submitted_at, rank, jury_score").in("competition_id", cids),
    db().from("team_members").select("team_id, user_id, field, competition_id").in("competition_id", cids),
    db().from("applications").select("competition_id, field").in("competition_id", cids),
  ]);
  const memberRows = (members.data ?? []) as Member[];
  const people = memberRows.length
    ? (((await db().from("profiles").select("id, username, name").in("id", [...new Set(memberRows.map((m) => m.user_id))])).data ?? []) as { id: string; username: string; name: string }[])
    : [];
  const person = new Map(people.map((p) => [p.id, p]));
  const appRows = (apps.data ?? []) as { competition_id: string; field: Field }[];

  return rows.map((c) => ({
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
    teams: ((teams.data ?? []) as { id: string; competition_id: string; name: string; repo_url: string | null; submitted_at: string | null; rank: number | null; jury_score: number | null }[])
      .filter((t) => t.competition_id === c.id)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name, "tr"))
      .map(
        (t): Team => ({
          id: t.id,
          competitionId: c.id,
          name: t.name,
          repoUrl: t.repo_url ?? undefined,
          submitted: !!t.submitted_at,
          rank: t.rank ?? undefined,
          juryScore: t.jury_score ?? undefined,
          members: memberRows
            .filter((m) => m.team_id === t.id)
            .map((m) => ({ username: person.get(m.user_id)?.username ?? "silinmis", name: person.get(m.user_id)?.name ?? "Silinmiş kullanıcı", field: m.field })),
        }),
      ),
  }));
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
  if (!pr.data) return null;
  const p = pr.data as ProfileRow;
  const [exps, projects, certs, approvals, conns, members] = await Promise.all([
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", p.id).order("created_at", { ascending: false }),
    db().from("projects").select("id, name, repo_owner, repo_name, description, techs, role, language, demo_url, analysis, points, created_at").eq("user_id", p.id).order("created_at", { ascending: false }),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", p.id).order("issued_on", { ascending: false }),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", p.id).eq("status", "Onaylandı"),
    db().from("connections").select("other_id").eq("user_id", p.id).limit(12),
    db().from("team_members").select("team_id, competition_id, field").eq("user_id", p.id),
  ]);
  const connIds = ((conns.data ?? []) as { other_id: string }[]).map((c) => c.other_id);
  const mem = (members.data ?? []) as { team_id: string; competition_id: string; field: Field }[];
  const [connPeople, comps, teams] = await Promise.all([
    connIds.length ? db().from("profiles").select("username, name, field").in("id", connIds) : Promise.resolve({ data: [] }),
    mem.length ? db().from("competitions").select("id, code, title, status").in("id", mem.map((m) => m.competition_id)) : Promise.resolve({ data: [] }),
    mem.length ? db().from("teams").select("id, rank").in("id", mem.map((m) => m.team_id)) : Promise.resolve({ data: [] }),
  ]);
  const teamRank = new Map(((teams.data ?? []) as { id: string; rank: number | null }[]).map((t) => [t.id, t.rank]));

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
    projects: ((projects.data ?? []) as ProjectRow[]).map(toProject).map((x) => ({
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
      const rank = teamRank.get(m.team_id);
      const detail = c.status === "Tamamlandı" ? (rank && rank <= 3 ? `${rank}. · ${m.field}` : `Katıldı · ${m.field}`) : `Devam ediyor · ${m.field}`;
      return { id: c.id, label: `${c.code} ${c.title}`, detail };
    }),
    education: p.education ?? [],
    skills: p.skills ?? [],
    interests: p.interests ?? [],
    connections: (connPeople.data ?? []) as { username: string; name: string; field: string }[],
    score: p.score,
    level: levelOf(p.score),
    rank: await rankFor(p.score),
    cvCode: p.cv_code,
  };
});

export async function usernameByCvCode(code: string) {
  if (!/^TLT-[A-Z0-9]{10}$/.test(code)) return null;
  const r = await db().from("profiles").select("username").eq("cv_code", code).maybeSingle();
  return (r.data as { username: string } | null)?.username ?? null;
}
