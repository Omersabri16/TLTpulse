import "server-only";

import { mentorEarned, scoreItems, stepDone, sumBySource, type RoadmapContext } from "@/lib/score";
import { fmtClock, fmtRelative } from "@/lib/time";
import type {
  Badge,
  ChatLine,
  CompetitionHistoryItem,
  Conversation,
  CredentialItem,
  Field,
  Level,
  MeData,
  MeScore,
  PersonRef,
  Roadmap,
  ScoreEvent,
  ScoreSource,
} from "@/lib/types";
import { db } from "./admin";
import { shareInfo } from "./share";
import {
  APPROVAL_COLS,
  PROFILE_COLS,
  PROJECT_COLS,
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
import { openSeason, rankFor } from "./season";

export const EMPTY_SCORE: MeScore = { total: 0, season: 0, level: "Yeni başlayan", parts: [], allParts: [], rank: { rank: 0, of: 0 }, roadmapDone: [] };

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
  season: null,
  badges: [],
  credentials: [],
  seasonResult: null,
  isAdmin: false,
  kvkkAccepted: false,
  blocked: [],
  connectionRequests: { incoming: [], outgoing: [] },
  achievement: null,
};

function check(res: { error: { message: string } | null }, what: string) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

interface CompRow {
  id: string;
  code: string;
  title: string;
  status: string;
}

type MemberRow = { team_id: string; competition_id: string; field: Field; points: number; commits: number | null; league: Level | null };

/** Kullanıcının takımları ve yarışmaları. */
async function teamsOf(userId: string) {
  const mine = must(await db().from("team_members").select("team_id, competition_id, field, points, commits, league").eq("user_id", userId), "takımlar") as MemberRow[];
  if (!mine.length) return { mine, comps: [] as CompRow[] };
  const comps = must(await db().from("competitions").select("id, code, title, status").in("id", mine.map((m) => m.competition_id)), "yarışma") as CompRow[];
  return { mine, comps };
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

/**
 * Puanı kaynak tablolardan yeniden hesaplar ve defteri (score_events) günceller: her kalemin beklenen puanı ile defterdeki
 * toplamı arasındaki fark yeni satır olarak açık sezona yazılır. Sezon puanı ve tüm zamanların toplamı defterden.
 * Puanı değiştiren her işlemden sonra çağrılır; tekrar çağrılması zararsızdır (fark yoksa yazmaz).
 */
export async function syncScore(userId: string): Promise<MeScore> {
  const [profile, projects, certs, approvals, peer, roadmap, apps, given, exps, t, season] = await Promise.all([
    db().from("profiles").select(PROFILE_COLS).eq("id", userId).single(),
    db().from("projects").select(PROJECT_COLS).eq("user_id", userId),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", userId),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", userId),
    db().from("peer_ratings").select("competition_id, stars, from_league").eq("to_user", userId),
    db().from("roadmaps").select("*").eq("user_id", userId).maybeSingle(),
    db().from("applications").select("competition_id, field").eq("user_id", userId),
    db().from("peer_ratings").select("team_id").eq("from_user", userId),
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", userId),
    teamsOf(userId),
    openSeason(),
  ]);
  const p = must(profile, "profil") as ProfileRow;
  const projectList = (must(projects, "proje") as ProjectRow[]).map(toProject);
  const certRows = must(certs, "sertifika") as CertRow[];
  const approvalRows = must(approvals, "onay") as ApprovalRow[];
  const ctx: RoadmapContext = {
    profile: toProfile(p, "", (must(exps, "deneyim") as ExperienceRow[]).map(toExperience), []),
    projects: projectList.filter((x) => x.status === "hazır"),
    certs: certRows.map(toCert),
    references: approvalRows.map((r) => toReference(r)),
    applications: Object.fromEntries((must(apps, "başvuru") as { competition_id: string; field: Field }[]).map((a) => [a.competition_id, a.field])),
    peerGivenCount: new Set((must(given, "verilen puan") as { team_id: string }[]).map((g) => g.team_id)).size,
  };
  const rm = roadmapFromRow(must(roadmap, "yol haritası") as RoadmapRow | null);
  const roadmapDone = rm ? rm.steps.filter((st) => stepDone(st, ctx, rm.baseline)).map((st) => st.id) : [];

  // Yarışmalar: sadece tamamlananların kişisel puanı. Akran ve mentor puanı da tamamlananlardan.
  const completed = t.comps.filter((c) => c.status === "Tamamlandı");
  const compById = new Map(t.comps.map((c) => [c.id, c]));
  // Akran ve mentor puanı sadece o yarışmada commit'i olan üyeye (hiç kod yazmayan yıldızla puan toplayamaz).
  const memberOf = new Map(t.mine.map((m) => [m.competition_id, m]));
  const peerRows = (must(peer, "akran") as { competition_id: string; stars: number; from_league: Level | null }[]).filter(
    (r) => compById.get(r.competition_id)?.status === "Tamamlandı" && (memberOf.get(r.competition_id)?.commits ?? 0) > 0,
  );
  const byComp = new Map<string, { stars: number; fromLeague: Level | null }[]>();
  for (const r of peerRows) byComp.set(r.competition_id, [...(byComp.get(r.competition_id) ?? []), { stars: r.stars, fromLeague: r.from_league }]);

  // Mentor puanı: yarışma anında Orta / Kıdemli olan üye, takımındaki Yeni başlayanlardan ortalama 4+ yıldız aldıysa.
  // Ligler takıma girildiği an saklanır (team_members.league, peer_ratings.from_league; migration 0006, 0007).
  const mentor: { competitionId: string; code: string }[] = [];
  for (const [cid, list] of byComp) {
    const ratings = list.flatMap((x) => (x.fromLeague ? [{ stars: x.stars, fromLeague: x.fromLeague }] : []));
    if (mentorEarned(memberOf.get(cid)?.league ?? p.league, ratings)) mentor.push({ competitionId: cid, code: compById.get(cid)!.code });
  }

  const items = scoreItems({
    projects: projectList.map((x) => ({ id: x.id, name: x.name, points: x.analysis.points, status: x.status })),
    certs: certRows.map((c) => ({ id: c.id, name: c.name, provider: c.provider, points: c.points })),
    approvals: approvalRows.map((a) => ({ id: a.id, targetId: a.target_id, answeredAt: a.answered_at, label: a.target_label, approverName: a.approver_name, status: a.status, points: a.points })),
    competitions: completed.map((c) => ({ id: c.id, code: c.code, title: c.title, points: t.mine.find((m) => m.competition_id === c.id)?.points ?? 0 })),
    peer: [...byComp].map(([cid, list]) => ({ competitionId: cid, code: compById.get(cid)!.code, stars: list.map((x) => x.stars) })),
    mentor,
    // Anahtar adımın türü: her tür (proje ekle, hakkında yaz...) kullanıcı başına bir kez puan verir. Yol haritasını
    // yenileyip (ya da hedefi değiştirip) aynı adımı yeniden tamamlamak puan getirmez.
    roadmap: rm ? rm.steps.filter((s) => roadmapDone.includes(s.id)).map((s) => ({ ref: `roadmap:${s.check}`, label: `Yol haritası: ${s.title}`, points: s.points })) : [],
  });

  check(await db().rpc("apply_score_items", { p_user: userId, p_items: items }), "puan defteri");
  if (mentor.length)
    await db()
      .from("badges")
      .upsert(
        mentor.map((m) => ({ user_id: userId, kind: "Mentor", ref: `comp-${m.competitionId}`, label: `${m.code} mentoru` })),
        { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
      );

  const [ledgerRes, after] = await Promise.all([
    db().from("score_events").select("points, source, season_id").eq("user_id", userId),
    db().from("profiles").select("score, season_points, season_points_at").eq("id", userId).single(),
  ]);
  const ledger = must(ledgerRes, "puan defteri") as { points: number; source: ScoreSource; season_id: number }[];
  const a = must(after, "profil") as { score: number; season_points: number; season_points_at: string | null };
  const seasonEvents = season ? ledger.filter((e) => e.season_id === season.id) : [];
  return {
    total: a.score,
    season: a.season_points,
    level: p.league,
    parts: sumBySource(seasonEvents),
    allParts: sumBySource(ledger),
    rank: await rankFor(p.league, a.season_points, a.season_points_at),
    roadmapDone,
  };
}

/** Oturum sahibinin bütün verisi. Her değişiklikten sonra yeniden yüklenip istemciye döner. */
export async function loadMe(userId: string, email: string): Promise<MeData> {
  const profRes = await db().from("profiles").select(PROFILE_COLS).eq("id", userId).maybeSingle();
  const p = must(profRes, "profil") as ProfileRow | null;
  if (!p) return EMPTY_ME;

  const [exps, conns, projects, certs, approvals, peerIn, peerOut, events, apps, roadmap, t, convs, notes, score, season, badges, creds, result, blocks, creqs] = await Promise.all([
    db().from("experiences").select("id, kind, title, org, start_label, end_label, description").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("connections").select("other_id").eq("user_id", userId),
    db().from("projects").select(PROJECT_COLS).eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("certificates").select("id, name, provider, link, issued_on, status, points").eq("user_id", userId).order("issued_on", { ascending: false }),
    db().from("approvals").select(APPROVAL_COLS).eq("user_id", userId).order("requested_at", { ascending: false }),
    db().from("peer_ratings").select("from_user, competition_id, stars, note").eq("to_user", userId),
    db().from("peer_ratings").select("team_id, to_user, stars").eq("from_user", userId),
    db().from("score_events").select("id, source, label, points, season_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
    db().from("applications").select("competition_id, field").eq("user_id", userId),
    db().from("roadmaps").select("*").eq("user_id", userId).maybeSingle(),
    teamsOf(userId),
    db().from("conversations").select("id, user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    db().from("notifications").select("id, text, href, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    syncScore(userId),
    openSeason(),
    db().from("badges").select("kind, label, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("credentials").select("id, kind, title, status, url").eq("user_id", userId).order("created_at", { ascending: false }),
    db().from("season_results").select("season_id, from_league, to_league, champion").eq("user_id", userId).eq("seen", false).order("season_id", { ascending: false }).limit(1).maybeSingle(),
    db().from("blocks").select("blocked_id").eq("user_id", userId),
    db().from("connection_requests").select("from_id, to_id").or(`from_id.eq.${userId},to_id.eq.${userId}`).order("created_at", { ascending: false }),
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
  type TMsg = { id: number; team_id: string; user_id: string | null; text: string; created_at: string };
  const connIds = (must(conns, "bağlantı") as { other_id: string }[]).map((c) => c.other_id);
  const pin = must(peerIn, "akran") as { from_user: string | null; competition_id: string; stars: number; note: string | null }[];
  const pout = must(peerOut, "akran") as { team_id: string; to_user: string; stars: number }[];
  const messages = must(msgs, "mesaj") as Msg[];
  const tmessages = must(teamMsgs, "takım mesajı") as TMsg[];
  const blockedIds = (must(blocks, "engel") as { blocked_id: string }[]).map((b) => b.blocked_id);
  const reqs = must(creqs, "bağlantı isteği") as { from_id: string; to_id: string }[];

  // Adı geçen herkesin kullanıcı adı ve alanı tek sorguda.
  const ids = new Set<string>([
    ...connIds,
    ...blockedIds,
    ...reqs.flatMap((r) => [r.from_id, r.to_id]),
    ...pout.map((x) => x.to_user),
    ...conversations.flatMap((c) => [c.user_a, c.user_b]),
    ...tmessages.flatMap((m) => (m.user_id ? [m.user_id] : [])),
    ...(must(teamMembers, "üye") as { user_id: string }[]).map((m) => m.user_id),
  ]);
  ids.delete(userId);
  const peopleRows = ids.size
    ? (must(await db().from("profiles").select("id, username, name, field").in("id", [...ids]), "kişiler") as { id: string; username: string; name: string; field: string }[])
    : [];
  const byId = new Map(peopleRows.map((r) => [r.id, r]));
  const uname = (id: string | null) => (id === userId ? p.username : ((id && byId.get(id)?.username) ?? "silinmis"));
  const people: Record<string, PersonRef> = Object.fromEntries(peopleRows.map((r) => [r.username, { username: r.username, name: r.name, field: r.field }]));
  people.silinmis = { username: "silinmis", name: "Silinmiş kullanıcı", field: "" };

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
    const m = t.mine.find((x) => x.competition_id === c.id);
    return { id: c.id, label: `${c.code} ${c.title}`, detail: historyDetail(c.status, m?.field ?? "", m?.points ?? 0) };
  });

  const sr = must(result, "sezon sonucu") as { season_id: number; from_league: Level; to_league: Level; champion: boolean } | null;
  let seasonResult: MeData["seasonResult"] = null;
  if (sr) {
    const s = await db().from("seasons").select("name").eq("id", sr.season_id).maybeSingle();
    seasonResult = { seasonName: (s.data as { name: string } | null)?.name ?? "Sezon", from: sr.from_league, to: sr.to_league, champion: sr.champion };
  }

  return {
    session: { username: p.username },
    profile,
    projects: projectList,
    certs: certList,
    references,
    // Akran puanı anonim: kimin verdiği istemciye gönderilmez.
    peerReceived: pin.map((x) => ({ from: "", competitionId: x.competition_id, stars: x.stars, note: x.note ?? undefined })),
    peerGiven,
    history: (must(events, "puan geçmişi") as { id: string; source: ScoreEvent["source"]; label: string; points: number; season_id: number; created_at: string }[]).map((e) => ({
      id: e.id,
      at: e.created_at,
      source: e.source,
      label: e.label,
      points: e.points,
      seasonId: e.season_id,
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
    season,
    badges: (must(badges, "rozet") as { kind: Badge["kind"]; label: string; created_at: string }[]).map((b) => ({ kind: b.kind, label: b.label, at: b.created_at })),
    credentials: (must(creds, "sertifika") as { id: string; kind: CredentialItem["kind"]; title: string; status: CredentialItem["status"]; url: string | null }[]).map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      status: c.status,
      url: c.url ?? undefined,
    })),
    seasonResult,
    isAdmin: p.is_admin,
    kvkkAccepted: !!p.kvkk_accepted_at,
    blocked: blockedIds.map(uname),
    achievement: await shareInfo(p.username).then((s) => (s?.achieved ? { headline: s.headline, sub: s.sub } : null)),
    connectionRequests: {
      incoming: reqs.filter((r) => r.to_id === userId).map((r) => uname(r.from_id)),
      outgoing: reqs.filter((r) => r.from_id === userId).map((r) => uname(r.to_id)),
    },
  };
}

export function historyDetail(status: string, field: string, points: number) {
  if (status === "Tamamlandı") return points ? `${field} · +${points} puan` : `${field} · puan yok`;
  if (status === "Değerlendiriliyor") return `${field} · değerlendiriliyor`;
  if (status === "İptal") return `${field} · iptal edildi`;
  return `Devam ediyor · ${field}`;
}
