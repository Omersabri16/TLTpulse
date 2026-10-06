import "server-only";

import type { CompetitionStatus, Difficulty, SeasonInfo } from "@/lib/types";
import { db } from "./admin";
import { certifierConfigured } from "./certifier";
import { evalConfigured } from "./evaluation";
import { GEMINI_BUDGET } from "./gemini";
import { openSeason } from "./season";

export interface AdminCompetition {
  id: string;
  code: string;
  title: string;
  status: CompetitionStatus;
  difficulty: Difficulty;
  specId: string | null;
  publishOn: string | null;
  applyDeadline: string;
  start: string;
  end: string;
  locked: boolean;
  testsVerified: boolean;
  validation: { ok: boolean; sample_passed: number; sample_total: number; blank_passed: number; at: string } | null;
  calibration: string | null;
  isDemo: boolean;
  applicants: number;
  teams: number;
  lastRun: { kind: string; status: string; at: string } | null;
}

export interface AdminReport {
  id: string;
  type: string;
  targetId: string;
  reason: string;
  at: string;
  reporter: string;
  target: { username: string; name: string; suspended: boolean } | null;
}

export interface AdminData {
  competitions: AdminCompetition[];
  reports: AdminReport[];
  suspended: { username: string; name: string }[];
  season: SeasonInfo | null;
  gemini: { used: number; budget: number; byKind: Record<string, number> };
  config: { eval: boolean; certifier: boolean; cron: boolean; githubToken: boolean; site: string };
  pendingProjects: number;
  pendingCredentials: number;
  /** Sezon bugün bitse: kaç kişi yükselir, düşer, şampiyon olur */
  seasonPreview: { promoted: number; relegated: number; champions: number };
}

/** Yönetici sayfasının verisi. Çağıran requireAdmin ile kontrol etmiş olmalı. */
export async function loadAdmin(): Promise<AdminData> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  const [comps, apps, teams, runs, reports, suspended, usage, season, pendingProjects, pendingCreds, moves] = await Promise.all([
    db().from("competitions").select("id, code, title, status, difficulty, spec_id, spec, publish_on, apply_deadline, start_date, end_date, locked, tests_verified_at, calibration, is_demo").order("id", { ascending: false }),
    db().from("applications").select("competition_id"),
    db().from("teams").select("competition_id"),
    db().from("evaluation_runs").select("competition_id, kind, status, requested_at").order("requested_at", { ascending: false }).limit(200),
    db().from("reports").select("id, reporter_id, target_user, target_type, target_id, reason, created_at").eq("status", "Açık").order("created_at", { ascending: false }).limit(100),
    db().from("profiles").select("username, name").eq("suspended", true).limit(100),
    db().from("gemini_usage").select("kind, count").eq("day", today),
    openSeason(),
    db().from("projects").select("id", { count: "exact", head: true }).eq("status", "analiz bekliyor"),
    db().from("credentials").select("id", { count: "exact", head: true }).eq("status", "Beklemede"),
    db().rpc("season_moves"),
  ]);
  const order = { "Yeni başlayan": 0, Orta: 1, Kıdemli: 2 } as Record<string, number>;
  const mv = (moves.data ?? []) as { from_league: string; to_league: string; champion: boolean }[];
  const count = (rows: { competition_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.competition_id === id).length;
  const runRows = (runs.data ?? []) as { competition_id: string; kind: string; status: string; requested_at: string }[];

  const rep = (reports.data ?? []) as { id: string; reporter_id: string | null; target_user: string | null; target_type: string; target_id: string; reason: string; created_at: string }[];
  const ids = [...new Set(rep.flatMap((r) => [r.reporter_id, r.target_user]).filter(Boolean) as string[])];
  const people = ids.length
    ? (((await db().from("profiles").select("id, username, name, suspended").in("id", ids)).data ?? []) as { id: string; username: string; name: string; suspended: boolean }[])
    : [];
  const pmap = new Map(people.map((p) => [p.id, p]));
  const byKind: Record<string, number> = {};
  for (const u of (usage.data ?? []) as { kind: string; count: number }[]) byKind[u.kind] = u.count;

  return {
    competitions: ((comps.data ?? []) as {
      id: string;
      code: string;
      title: string;
      status: CompetitionStatus;
      difficulty: Difficulty;
      spec_id: string | null;
      spec: { validation?: AdminCompetition["validation"] };
      publish_on: string | null;
      apply_deadline: string;
      start_date: string;
      end_date: string;
      locked: boolean;
      tests_verified_at: string | null;
      calibration: string | null;
      is_demo: boolean;
    }[]).map((c) => {
      const last = runRows.find((r) => r.competition_id === c.id);
      return {
        id: c.id,
        code: c.code,
        title: c.title,
        status: c.status,
        difficulty: c.difficulty,
        specId: c.spec_id,
        publishOn: c.publish_on,
        applyDeadline: c.apply_deadline,
        start: c.start_date,
        end: c.end_date,
        locked: c.locked,
        testsVerified: !!c.tests_verified_at,
        validation: c.spec?.validation ?? null,
        calibration: c.calibration,
        isDemo: c.is_demo,
        applicants: count(apps.data as { competition_id: string }[] | null, c.id),
        teams: count(teams.data as { competition_id: string }[] | null, c.id),
        lastRun: last ? { kind: last.kind, status: last.status, at: last.requested_at } : null,
      };
    }),
    reports: rep.map((r) => ({
      id: r.id,
      type: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      at: r.created_at,
      reporter: (r.reporter_id && pmap.get(r.reporter_id)?.username) || "silinmiş",
      target: r.target_user && pmap.get(r.target_user) ? { username: pmap.get(r.target_user)!.username, name: pmap.get(r.target_user)!.name, suspended: pmap.get(r.target_user)!.suspended } : null,
    })),
    suspended: (suspended.data ?? []) as { username: string; name: string }[],
    season,
    gemini: { used: Object.values(byKind).reduce((a, b) => a + b, 0), budget: Math.max(...Object.values(GEMINI_BUDGET)), byKind },
    config: {
      eval: evalConfigured(),
      certifier: certifierConfigured(),
      cron: !!process.env.CRON_SECRET,
      githubToken: !!process.env.GITHUB_TOKEN,
      site: process.env.SITE_URL ?? "",
    },
    pendingProjects: pendingProjects.count ?? 0,
    pendingCredentials: pendingCreds.count ?? 0,
    seasonPreview: {
      promoted: mv.filter((m) => order[m.to_league] > order[m.from_league]).length,
      relegated: mv.filter((m) => order[m.to_league] < order[m.from_league]).length,
      champions: mv.filter((m) => m.champion).length,
    },
  };
}
