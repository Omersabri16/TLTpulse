import "server-only";

import { computeScore, levelOf, stepDone, type CompetitionResult, type RoadmapContext } from "@/lib/score";
import { fmtClock, fmtRelative } from "@/lib/time";
import type { ChatLine, CompetitionHistoryItem, Conversation, Field, Level, MeData, MeScore, PersonRef, Roadmap, ScoreEvent } from "@/lib/types";
import { db } from "./admin";
import {
  APPROVAL_COLS,
  PROFILE_COLS,
  toCert,
  toExperience,
  toProfile,
  toProject,
  toReference,
  type ApprovalRow,
  type CertRow,
  type ExperienceRow,
  type ProfileRow,
  type ProjectRow,
} from "./rows";

export const EMPTY_SCORE: MeScore = { total: 0, level: "Yeni başlayan", parts: [], rank: { rank: 0, of: 0 }, roadmapDone: [] };

export const EMPTY_ME: MeData = {
  session: null,
  profile: null,
  projects: [],
  certs: [],
  references: [],
  peerReceived: [],
  peerGiven: {},
  history: [],
  applications: {},
  roadmap: null,
  conversations: [],
  teamChats: {},
  notifications: [],
  score: EMPTY_SCORE,
  people: {},
  competitionHistory: [],
};

const LEVEL_RANGE: Record<Level, [number, number]> = { "Yeni başlayan": [-1e9, 60], Orta: [60, 80], Kıdemli: [80, 1e9] };

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

/** Sırayı saklanan puanlara göre hesaplar (eşit puan aynı sırayı alır). */
export async function rankFor(total: number) {
  const [lo, hi] = LEVEL_RANGE[levelOf(total)];
  const [above, all] = await Promise.all([
    db().from("profiles").select("id", { count: "exact", head: true }).gt("score", total).gte("score", lo).lt("score", hi),
    db().from("profiles").select("id", { count: "exact", head: true }).gte("score", lo).lt("score", hi),
  ]);
  return { rank: (above.count ?? 0) + 1, of: all.count ?? 0 };
}

interface CompRow {
  id: string;
  code: string;
  title: string;
  status: string;
}

/** Kullanıcının takımları, yarışmaları ve puana giren tamamlanmış yarışma sonuçları. */
async function teamsOf(userId: string) {
  const mine = must(await db().from("team_members").select("team_id, competition_id, field").eq("user_id", userId), "takımlar") as {
    team_id: string;
    competition_id: string;
    field: Field;
  }[];
  if (!mine.length) return { mine, teams: [] as { id: string; competition_id: string; rank: number | null }[], comps: [] as CompRow[] };
  const [teams, comps] = await Promise.all([
    db().from("teams").select("id, competition_id, rank").in("id", mine.map((m) => m.team_id)),
    db().from("competitions").select("id, code, title, status").in("id", mine.map((m) => m.competition_id)),
  ]);
  return {
    mine,
    teams: must(teams, "takım") as { id: string; competition_id: string; rank: number | null }[],
    comps: must(comps, "yarışma") as CompRow[],
  };
}

function completedResults(t: Awaited<ReturnType<typeof teamsOf>>): CompetitionResult[] {
  return t.comps
    .filter((c) => c.status === "Tamamlandı")
    .map((c) => ({ id: c.id, code: c.code, title: c.title, rank: t.teams.find((x) => x.competition_id === c.id)?.rank ?? null }));
}

/** Puanı kaynak tablolardan yeniden hesaplayıp profile yazar. Puanı değiştiren her işlemden sonra çağrılır. */
export async function syncScore(userId: string) {
  const [profile, projects, certs, approvals, peer, roadmap, apps, given, exps, t] = await Promise.all([
    db().from("profiles").select(PROFILE_COLS).eq("id", userId).single(),
    db().from("projects").select("id, name, repo_owner, repo_name, description, techs, role, language, demo_url, analysis, points, created_at").eq("user_id", userId),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", userId),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", userId),
    db().from("peer_ratings").select("competition_id, stars").eq("to_user", userId),
    db().from("roadmaps").select("*").eq("user_id", userId).maybeSingle(),
    db().from("applications").select("competition_id, field").eq("user_id", userId),
    db().from("peer_ratings").select("team_id").eq("from_user", userId),
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", userId),
    teamsOf(userId),
  ]);
  const p = must(profile, "profil") as ProfileRow;
  const ctx: RoadmapContext = {
    profile: toProfile(p, "", (must(exps, "deneyim") as ExperienceRow[]).map(toExperience), []),
    projects: (must(projects, "proje") as ProjectRow[]).map(toProject),
    certs: (must(certs, "sertifika") as CertRow[]).map(toCert),
    references: (must(approvals, "onay") as ApprovalRow[]).map((r) => toReference(r)),
    applications: Object.fromEntries((must(apps, "başvuru") as { competition_id: string; field: Field }[]).map((a) => [a.competition_id, a.field])),
    peerGivenCount: new Set((must(given, "verilen puan") as { team_id: string }[]).map((g) => g.team_id)).size,
  };
  const rm = roadmapFromRow(must(roadmap, "yol haritası") as RoadmapRow | null);
  return calc(userId, p, ctx, (must(peer, "akran") as { competition_id: string; stars: number }[]).map((x) => ({ stars: x.stars, competitionId: x.competition_id })), completedResults(t), rm);
}

async function calc(
  userId: string,
  p: ProfileRow,
  ctx: RoadmapContext,
  peerReceived: { stars: number; competitionId?: string }[],
  completed: CompetitionResult[],
  roadmap: Roadmap | null,
): Promise<MeScore> {
  const roadmapDone = roadmap ? roadmap.steps.filter((st) => stepDone(st, ctx, roadmap.baseline)).map((st) => st.id) : [];
  const roadmapDonePoints = roadmap ? roadmap.steps.filter((s) => roadmapDone.includes(s.id)).reduce((a, s) => a + s.points, 0) : 0;
  const s = computeScore({
    projects: ctx.projects,
    certs: ctx.certs,
    references: ctx.references,
    peerReceived,
    completedCompetitions: completed,
    roadmapDonePoints,
  });
  // seed_points sadece örnek (demo) kullanıcılar için; gerçek hesaplarda 0.
  const total = s.total + p.seed_points;
  if (total !== p.score) await db().from("profiles").update({ score: total }).eq("id", userId);
  return { total, level: levelOf(total), parts: s.parts, rank: await rankFor(total), roadmapDone };
}

interface RoadmapRow {
  target: Field;
  summary: string;
  steps: Roadmap["steps"];
  baseline: Roadmap["baseline"];
  generated_at: string;
}

export const roadmapFromRow = (r: RoadmapRow | null): Roadmap | null =>
  r ? { target: r.target, summary: r.summary, steps: r.steps, baseline: r.baseline, generatedAt: r.generated_at } : null;

/** Oturum sahibinin bütün verisi. Her değişiklikten sonra yeniden yüklenip istemciye döner. */
export async function loadMe(userId: string, email: string): Promise<MeData> {
  const profRes = await db().from("profiles").select(PROFILE_COLS).eq("id", userId).maybeSingle();
  const p = must(profRes, "profil") as ProfileRow | null;
  if (!p) return EMPTY_ME;

  const [exps, conns, projects, certs, approvals, peerIn, peerOut, events, apps, roadmap, t, convs, notes] = await Promise.all([
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("connections").select("other_id").eq("user_id", userId),
    db().from("projects").select("id, name, repo_owner, repo_name, description, techs, role, language, demo_url, analysis, points, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", userId).order("issued_on", { ascending: false }),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", userId).order("requested_at", { ascending: false }),
    db().from("peer_ratings").select("from_user, competition_id, stars, note").eq("to_user", userId),
    db().from("peer_ratings").select("team_id, to_user, stars").eq("from_user", userId),
    db().from("score_events").select("id, source, label, points, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db().from("applications").select("competition_id, field").eq("user_id", userId),
    db().from("roadmaps").select("*").eq("user_id", userId).maybeSingle(),
    teamsOf(userId),
    db().from("conversations").select("id, user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    db().from("notifications").select("id, text, href, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);

  const conversations = must(convs, "sohbet") as { id: string; user_a: string; user_b: string }[];
  const teamIds = t.mine.map((m) => m.team_id);
  const [msgs, teamMsgs, teamMembers] = await Promise.all([
    conversations.length
      ? db().from("messages").select("id, conversation_id, sender_id, text, created_at").in("conversation_id", conversations.map((c) => c.id)).order("created_at").limit(1000)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? db().from("team_messages").select("id, team_id, user_id, text, created_at").in("team_id", teamIds).order("created_at").limit(1000)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length ? db().from("team_members").select("team_id, user_id").in("team_id", teamIds) : Promise.resolve({ data: [], error: null }),
  ]);

  type Msg = { id: number; conversation_id: string; sender_id: string; text: string; created_at: string };
  type TMsg = { id: number; team_id: string; user_id: string; text: string; created_at: string };
  const connIds = (must(conns, "bağlantı") as { other_id: string }[]).map((c) => c.other_id);
  const pin = must(peerIn, "akran") as { from_user: string; competition_id: string; stars: number; note: string | null }[];
  const pout = must(peerOut, "akran") as { team_id: string; to_user: string; stars: number }[];
  const messages = must(msgs, "mesaj") as Msg[];
  const tmessages = must(teamMsgs, "takım mesajı") as TMsg[];

  // Adı geçen herkesin kullanıcı adı ve alanı tek sorguda.
  const ids = new Set<string>([
    ...connIds,
    ...pout.map((x) => x.to_user),
    ...conversations.flatMap((c) => [c.user_a, c.user_b]),
    ...tmessages.map((m) => m.user_id),
    ...(must(teamMembers, "üye") as { user_id: string }[]).map((m) => m.user_id),
  ]);
  ids.delete(userId);
  const peopleRows = ids.size
    ? (must(await db().from("profiles").select("id, username, name, field").in("id", [...ids]), "kişiler") as { id: string; username: string; name: string; field: string }[])
    : [];
  const byId = new Map(peopleRows.map((r) => [r.id, r]));
  const uname = (id: string) => (id === userId ? p.username : (byId.get(id)?.username ?? "silinmis"));
  const people: Record<string, PersonRef> = Object.fromEntries(peopleRows.map((r) => [r.username, { username: r.username, name: r.name, field: r.field }]));

  const experiences = (must(exps, "deneyim") as ExperienceRow[]).map(toExperience);
  const profile = toProfile(p, email, experiences, connIds.map(uname));
  const projectList = (must(projects, "proje") as ProjectRow[]).map(toProject);
  const certList = (must(certs, "sertifika") as CertRow[]).map(toCert);
  const references = (must(approvals, "onay") as ApprovalRow[]).map((r) => toReference(r));
  const applications = Object.fromEntries((must(apps, "başvuru") as { competition_id: string; field: Field }[]).map((a) => [a.competition_id, a.field]));
  const rm = roadmapFromRow(must(roadmap, "yol haritası") as RoadmapRow | null);

  const peerGiven: MeData["peerGiven"] = {};
  for (const g of pout) (peerGiven[g.team_id] ??= {})[uname(g.to_user)] = g.stars;

  const teamChats: Record<string, ChatLine[]> = Object.fromEntries(teamIds.map((id) => [id, [] as ChatLine[]]));
  for (const m of tmessages) teamChats[m.team_id]?.push({ id: String(m.id), from: m.user_id === userId ? "me" : uname(m.user_id), text: m.text, at: fmtClock(m.created_at) });

  const convList: (Conversation & { last: string })[] = conversations.map((c) => {
    const lines = messages.filter((m) => m.conversation_id === c.id);
    return {
      id: c.id,
      with: uname(c.user_a === userId ? c.user_b : c.user_a),
      messages: lines.map((m) => ({ id: String(m.id), from: m.sender_id === userId ? "me" : uname(m.sender_id), text: m.text, at: fmtClock(m.created_at) })),
      last: lines.at(-1)?.created_at ?? "",
    };
  });
  convList.sort((a, b) => b.last.localeCompare(a.last));

  const competitionHistory: CompetitionHistoryItem[] = t.comps.map((c) => {
    const team = t.teams.find((x) => x.competition_id === c.id);
    const field = t.mine.find((m) => m.competition_id === c.id)?.field ?? "";
    const detail = c.status === "Tamamlandı" ? (team?.rank && team.rank <= 3 ? `${team.rank}. · ${field}` : `Katıldı · ${field}`) : `Devam ediyor · ${field}`;
    return { id: c.id, label: `${c.code} ${c.title}`, detail };
  });

  const ctx: RoadmapContext = { profile, projects: projectList, certs: certList, references, applications, peerGivenCount: Object.keys(peerGiven).length };
  const score = await calc(
    userId,
    p,
    ctx,
    pin.map((x) => ({ stars: x.stars, competitionId: x.competition_id })),
    completedResults(t),
    rm,
  );

  return {
    session: { username: p.username },
    profile,
    projects: projectList,
    certs: certList,
    references,
    // Akran puanı anonim: kimin verdiği istemciye gönderilmez.
    peerReceived: pin.map((x) => ({ from: "", competitionId: x.competition_id, stars: x.stars, note: x.note ?? undefined })),
    peerGiven,
    history: (must(events, "puan geçmişi") as { id: string; source: ScoreEvent["source"]; label: string; points: number; created_at: string }[]).map((e) => ({
      id: e.id,
      at: e.created_at,
      source: e.source,
      label: e.label,
      points: e.points,
    })),
    applications,
    roadmap: rm,
    conversations: convList.map((c) => ({ id: c.id, with: c.with, messages: c.messages })),
    teamChats,
    notifications: (must(notes, "bildirim") as { id: string; text: string; href: string; read: boolean; created_at: string }[]).map((n) => ({
      id: n.id,
      text: n.text,
      href: n.href,
      read: n.read,
      at: fmtRelative(n.created_at),
    })),
    score,
    people,
    competitionHistory,
  };
}
