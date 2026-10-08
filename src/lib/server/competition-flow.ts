import "server-only";

import { calibrationOf, COPY_RATIO, coverageOf, levelRank, MIN_COVERAGE, personalPoints, qualityScore, snakeDraft, teamPoints, teamworkScore } from "@/lib/score";
import type { Difficulty, Field, Level, TeamResult } from "@/lib/types";
import { db } from "./admin";
import { dispatchRun, EvalError } from "./evaluation";
import { ciGreen, commitsBetween, counted, gh, GitHubError, repoInfo, treeAt } from "./github";
import { syncScore } from "./me";
import { notify } from "./notify";
import { urlOpens } from "./safe-fetch";

// Yarışmanın yaşam döngüsü (kararlar.md Bölüm 5): Sırada → Başvurular açık → (takımlar kurulur) Devam ediyor →
// (teslim saatinde commit'ler dondurulur) Değerlendiriliyor → (Actions sonucu gelir) Tamamlandı. İnsan puana karışmaz.

const TZ_OFFSET = "+03:00";
export const endOfDay = (d: string) => new Date(`${d}T23:59:59${TZ_OFFSET}`);
export const startOfDay = (d: string) => new Date(`${d}T00:00:00${TZ_OFFSET}`);
export const todayTR = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

interface CompRow {
  id: string;
  code: string;
  title: string;
  status: string;
  difficulty: Difficulty;
  spec_id: string | null;
  positions: { field: Field; perTeam: number }[];
  apply_deadline: string;
  start_date: string;
  end_date: string;
  is_demo: boolean;
}

const COMP_COLS = "id, code, title, status, difficulty, spec_id, positions, apply_deadline, start_date, end_date, is_demo";

export async function getComp(id: string) {
  const r = await db().from("competitions").select(COMP_COLS).eq("id", id).maybeSingle();
  if (r.error) throw new Error(`yarışma: ${r.error.message}`);
  return r.data as CompRow | null;
}

async function membersOf(cid: string) {
  const r = await db().from("team_members").select("team_id, user_id, field").eq("competition_id", cid);
  return (r.data ?? []) as { team_id: string; user_id: string; field: Field }[];
}

// ---------- 1) Sıradaki yarışmayı aç ----------

export async function openQueued() {
  const r = await db().from("competitions").update({ status: "Başvurular açık" }).eq("status", "Sırada").lte("publish_on", todayTR()).select("id");
  if (r.error) throw new Error(`yarışma açma: ${r.error.message}`);
  return ((r.data ?? []) as { id: string }[]).map((x) => x.id);
}

// ---------- 2) Takımları kur ----------

const TEAM_NAMES = ["Atlas", "Bora", "Çınar", "Delta", "Ekin", "Fener", "Gökçe", "Harman", "Işık", "Kuzey", "Lodos", "Meltem", "Nova", "Orkun", "Poyraz", "Rota", "Sarp", "Tuna", "Umut", "Vira", "Yaman", "Zirve"];

/**
 * Her pozisyonun başvuranları lig ve sezon puanına göre sıralanır, takımlara yılan sırasıyla dağıtılır (1. takım bir
 * pozisyonda en güçlüyü alırsa sonrakinde en zayıfı alır). Takım sayısı = en az başvurulan pozisyonun başvuru sayısı;
 * artanlar yedek. Hiç takım kurulamazsa yarışma iptal.
 */
export async function formTeams(cid: string) {
  const c = await getComp(cid);
  if (!c || c.status !== "Başvurular açık") throw new EvalError("Bu yarışmada takım kurulamaz.");
  const apps = (await db().from("applications").select("user_id, field, created_at").eq("competition_id", cid)).data as { user_id: string; field: Field; created_at: string }[] | null;
  const list = apps ?? [];
  const prof = list.length
    ? (((await db().from("profiles").select("id, league, season_points, suspended").in("id", list.map((a) => a.user_id))).data ?? []) as { id: string; league: Level; season_points: number; suspended: boolean }[])
    : [];
  const pmap = new Map(prof.map((p) => [p.id, p]));
  const fields = c.positions.map((p) => p.field);
  const byField = fields.map((f) =>
    list
      .filter((a) => a.field === f && !pmap.get(a.user_id)?.suspended)
      .sort((a, b) => {
        const pa = pmap.get(a.user_id)!;
        const pb = pmap.get(b.user_id)!;
        return levelRank(pb.league) - levelRank(pa.league) || pb.season_points - pa.season_points || a.created_at.localeCompare(b.created_at);
      }),
  );
  const draft = snakeDraft(byField.map((list, k) => list.map((a) => ({ user_id: a.user_id, field: fields[k] }))));
  const n = draft.teams.length;
  if (!n) {
    await db().from("competitions").update({ status: "İptal", cancel_reason: "Her pozisyona yeterli başvuru gelmedi." }).eq("id", cid);
    for (const a of list) await notify(a.user_id, `${c.code} ${c.title} yeterli başvuru gelmediği için iptal edildi.`, `/yarismalar/${cid}`);
    return { teams: 0, substitutes: 0, cancelled: true };
  }

  const slots = draft.teams;

  const created = await db()
    .from("teams")
    .insert(slots.map((_, i) => ({ competition_id: cid, name: TEAM_NAMES[i % TEAM_NAMES.length] + (i >= TEAM_NAMES.length ? ` ${Math.floor(i / TEAM_NAMES.length) + 1}` : "") })))
    .select("id, name");
  if (created.error) throw new Error(`takım: ${created.error.message}`);
  const teams = created.data as { id: string; name: string }[];
  const rows = slots.flatMap((members, i) => members.map((m) => ({ team_id: teams[i].id, competition_id: cid, user_id: m.user_id, field: m.field })));
  const ins = await db().from("team_members").insert(rows);
  if (ins.error) throw new Error(`takım üyeleri: ${ins.error.message}`);

  const inTeam = new Set(rows.map((r) => r.user_id));
  await db().from("applications").update({ status: "Takımda" }).eq("competition_id", cid).in("user_id", [...inTeam]);
  const subs = list.filter((a) => !inTeam.has(a.user_id)).map((a) => a.user_id);
  if (subs.length) await db().from("applications").update({ status: "Yedek" }).eq("competition_id", cid).in("user_id", subs);
  // Yönetici takımları erken kurduysa yarışma o gün başlamış olur (repo tarihi ve commit aralığı buna göre).
  const today = todayTR();
  await db()
    .from("competitions")
    .update({ status: "Devam ediyor", ...(c.start_date > today ? { start_date: today } : {}) })
    .eq("id", cid);

  for (const r of rows) {
    const t = teams.find((x) => x.id === r.team_id)!;
    await notify(r.user_id, `${c.code}: takımın kuruldu (${t.name}, ${r.field}). Takım sohbetine geç; teslimde GitHub reposu ve demo linki gerekecek.`, `/takim/${t.id}`);
  }
  for (const u of subs) await notify(u, `${c.code}: bu sefer yedek listesindesin. Bir takımda yer açılırsa haber vereceğiz.`, `/yarismalar/${cid}`);
  return { teams: teams.length, substitutes: subs.length, cancelled: false };
}

/**
 * Takım kurulduktan 48 saat sonra takım sohbetine hiç yazmamış üye, aynı pozisyondaki yedekle değiştirilir (bir kez).
 * Kurulduktan 48–96 saat arası takımlara bakılır.
 */
export async function replaceInactive() {
  const now = Date.now();
  const teams = ((await db().from("teams").select("id, competition_id, name, created_at").lt("created_at", new Date(now - 48 * 3600_000).toISOString()).gt("created_at", new Date(now - 96 * 3600_000).toISOString())).data ?? []) as {
    id: string;
    competition_id: string;
    name: string;
    created_at: string;
  }[];
  let replaced = 0;
  for (const t of teams) {
    const c = await getComp(t.competition_id);
    if (!c || c.status !== "Devam ediyor" || c.is_demo) continue;
    const members = ((await db().from("team_members").select("user_id, field").eq("team_id", t.id)).data ?? []) as { user_id: string; field: Field }[];
    const talked = new Set((((await db().from("team_messages").select("user_id").eq("team_id", t.id)).data ?? []) as { user_id: string | null }[]).map((m) => m.user_id));
    for (const m of members.filter((x) => !talked.has(x.user_id))) {
      const sub = ((await db().from("applications").select("user_id").eq("competition_id", c.id).eq("status", "Yedek").eq("field", m.field).order("created_at").limit(1)).data ?? []) as { user_id: string }[];
      if (!sub[0]) continue;
      await db().from("team_members").delete().eq("team_id", t.id).eq("user_id", m.user_id);
      const ins = await db().from("team_members").insert({ team_id: t.id, competition_id: c.id, user_id: sub[0].user_id, field: m.field });
      if (ins.error) continue;
      await db().from("applications").update({ status: "Yedek" }).eq("competition_id", c.id).eq("user_id", m.user_id);
      await db().from("applications").update({ status: "Takımda" }).eq("competition_id", c.id).eq("user_id", sub[0].user_id);
      await notify(m.user_id, `${c.code}: 48 saat takım sohbetine yazmadığın için yerine yedek geçti.`, `/yarismalar/${c.id}`);
      await notify(sub[0].user_id, `${c.code}: yedekten ${t.name} takımına geçtin (${m.field}).`, `/takim/${t.id}`);
      replaced++;
    }
  }
  return replaced;
}

// ---------- 3) Teslim: dondur ve değerlendir ----------

interface TeamSignals {
  ci?: boolean;
  teamwork?: number;
  contributions?: Record<string, number>;
  memberCommits?: Record<string, number>;
  repoCreatedAt?: string;
  eliminated?: string;
  shas?: string[];
}

async function frozenSha(owner: string, repo: string, branch: string, until: string) {
  const list = await gh<{ sha: string }[]>(`/repos/${owner}/${repo}/commits?per_page=1&sha=${encodeURIComponent(branch)}&until=${encodeURIComponent(until)}`);
  return list[0]?.sha ?? null;
}

/** Bir takımın teslim anındaki sinyalleri (GitHub API). Elenme sebebi varsa `eliminated`. */
async function teamSignals(
  c: CompRow,
  t: { id: string; repo_url: string | null; demo_url: string | null; created_at: string },
  members: { user_id: string; github: string; verified: boolean }[],
): Promise<{ sha: string | null; signals: TeamSignals }> {
  if (!t.repo_url) return { sha: null, signals: { eliminated: "Teslim yapılmadı (GitHub reposu yok)." } };
  if (!t.demo_url) return { sha: null, signals: { eliminated: "Teslimde demo linki yok." } };
  const [, owner, repo] = t.repo_url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/) ?? [];
  // Yarışma erken başlatıldıysa (takımlar başlangıç tarihinden önce kurulduysa) başlangıç takımın kurulduğu gündür.
  const start = new Date(Math.min(startOfDay(c.start_date).getTime(), startOfDay(new Date(t.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })).getTime()));
  const since = start.toISOString();
  const until = endOfDay(c.end_date).toISOString();
  try {
    const info = await repoInfo(owner, repo);
    if (info.fork) return { sha: null, signals: { eliminated: "Teslim edilen repo bir fork." } };
    if (new Date(info.createdAt) < start) return { sha: null, signals: { eliminated: "Repo yarışma başlamadan açılmış.", repoCreatedAt: info.createdAt } };
    const sha = await frozenSha(info.owner, info.repo, info.defaultBranch, until);
    if (!sha) return { sha: null, signals: { eliminated: "Teslim saatinden önce hiç commit yok." } };
    const [tree, ci, commits, opens] = await Promise.all([
      treeAt(info.owner, info.repo, sha),
      ciGreen(info.owner, info.repo, sha),
      commitsBetween(info.owner, info.repo, sha, since, until),
      urlOpens(t.demo_url),
    ]);
    const contributions: Record<string, number> = {};
    for (const x of commits) if (x.login) contributions[x.login] = (contributions[x.login] ?? 0) + 1;
    const memberCommits = Object.fromEntries(members.map((m) => [m.user_id, m.verified && m.github ? (contributions[m.github.toLowerCase()] ?? 0) : 0]));
    const days = new Set(commits.map((x) => x.date.slice(0, 10))).size;
    const lastTwo = commits.filter((x) => new Date(x.date).getTime() > endOfDay(c.end_date).getTime() - 48 * 3600_000).length;
    const signals: TeamSignals = {
      ci,
      contributions,
      memberCommits,
      teamwork: teamworkScore(Object.values(memberCommits), days, commits.length ? lastTwo / commits.length : 1),
      repoCreatedAt: info.createdAt,
      shas: [...new Set(tree.filter((f) => counted(f.path, f.size)).map((f) => f.sha))].slice(0, 4000),
    };
    if (!opens) signals.eliminated = "Teslim anında demo açılmıyor.";
    return { sha, signals };
  } catch (e) {
    return { sha: null, signals: { eliminated: e instanceof GitHubError ? `Repoya ulaşılamadı: ${e.message}` : "Repoya ulaşılamadı." } };
  }
}

/** Teslim süresi biten yarışma: commit'ler dondurulur, elenmeler belirlenir, gizli testler Actions'ta başlatılır. */
export async function freezeAndEvaluate(cid: string) {
  const c = await getComp(cid);
  if (!c || c.status !== "Devam ediyor") throw new EvalError("Bu yarışma değerlendirmeye hazır değil.");
  const teams = ((await db().from("teams").select("id, repo_url, demo_url, frozen_sha, signals, created_at").eq("competition_id", cid)).data ?? []) as {
    id: string;
    created_at: string;
    repo_url: string | null;
    demo_url: string | null;
    frozen_sha: string | null;
    signals: TeamSignals;
  }[];
  const members = await membersOf(cid);
  const prof = members.length
    ? (((await db().from("profiles").select("id, github, github_verified").in("id", members.map((m) => m.user_id))).data ?? []) as { id: string; github: string; github_verified: boolean }[])
    : [];
  const gmap = new Map(prof.map((p) => [p.id, p]));

  // Örnek (demo) yarışmanın takımları uydurma repolar: sinyalleri seed'den gelir, GitHub'a gidilmez.
  const frozen = c.is_demo
    ? teams.map((t) => ({ id: t.id, created: t.signals.repoCreatedAt ?? "", sha: t.frozen_sha, signals: t.signals, demo: t.demo_url, repo: t.repo_url }))
    : await Promise.all(
        teams.map(async (t) => {
          const ms = members.filter((m) => m.team_id === t.id).map((m) => ({ user_id: m.user_id, github: gmap.get(m.user_id)?.github ?? "", verified: !!gmap.get(m.user_id)?.github_verified }));
          const r = await teamSignals(c, t, ms);
          return { id: t.id, created: r.signals.repoCreatedAt ?? "", sha: r.sha, signals: r.signals, demo: t.demo_url, repo: t.repo_url };
        }),
      );

  // Başka takımla büyük ölçüde aynı kod: şablon dosyaları hariç %50+ örtüşmede sonradan açılan repo elenir.
  const live = frozen.filter((t) => !t.signals.eliminated && t.signals.shas?.length);
  if (live.length > 1) {
    const all = [...new Set(live.flatMap((t) => t.signals.shas!))];
    const tpl = new Set(((await db().rpc("template_shas", { p_shas: all })).data ?? []) as string[]);
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const a = new Set(live[i].signals.shas!.filter((s) => !tpl.has(s)));
        const b = live[j].signals.shas!.filter((s) => !tpl.has(s));
        const shared = b.filter((s) => a.has(s)).length;
        if (shared / Math.max(1, Math.min(a.size, b.length)) >= COPY_RATIO) {
          const later = live[i].created > live[j].created ? live[i] : live[j];
          later.signals.eliminated ??= "Başka bir takımın koduyla büyük ölçüde aynı.";
        }
      }
  }

  for (const t of frozen) {
    const { shas, ...keep } = t.signals;
    void shas;
    await db().from("teams").update({ frozen_sha: t.sha, signals: keep }).eq("id", t.id);
  }

  const toTest = frozen.filter((t) => !t.signals.eliminated);
  if (!toTest.length) {
    await finalize(c, []);
    return { dispatched: false, teams: 0 };
  }
  await dispatchRun("degerlendirme", cid, {
    spec_id: c.spec_id,
    teams: toTest.map((t) => ({ team_id: t.id, demo_url: t.demo, repo: t.repo?.replace("https://github.com/", "") ?? null, sha: t.sha })),
  });
  await db().from("competitions").update({ status: "Değerlendiriliyor" }).eq("id", cid);
  return { dispatched: true, teams: toTest.length };
}

// ---------- 4) Sonuç geri geldi ----------

export interface RunTeamResult {
  team_id: string;
  reachable: boolean;
  tests: { id: string; title: string; public: boolean; passed: boolean }[];
  lighthouse?: { accessibility: number; performance: number; mobile: number } | null;
  lint_errors?: number | null;
  audit_high?: number | null;
}

/** Puanı testlerin ve ölçümlerin sonucu belirler (Gemini ya da insan değil). */
export async function finalize(c: CompRow, results: RunTeamResult[]) {
  const teams = ((await db().from("teams").select("id, name, signals").eq("competition_id", c.id)).data ?? []) as { id: string; name: string; signals: TeamSignals }[];
  const members = await membersOf(c.id);
  const coverages: number[] = [];

  for (const t of teams) {
    const r = results.find((x) => x.team_id === t.id);
    const hidden = (r?.tests ?? []).filter((x) => !x.public);
    let eliminated = t.signals.eliminated;
    if (!eliminated && r && !r.reachable) eliminated = "Değerlendirme sırasında demo açılmadı.";
    if (!eliminated && !r) eliminated = "Değerlendirme sonucu gelmedi.";
    const correctness = hidden.length ? hidden.filter((x) => x.passed).length / hidden.length : 0;
    const quality = qualityScore({ lighthouse: r?.lighthouse, lintErrors: r?.lint_errors, auditHigh: r?.audit_high, ci: t.signals.ci });
    const teamwork = t.signals.teamwork ?? 0;
    const coverage = eliminated ? 0 : Math.round(coverageOf(correctness, quality, teamwork) * 1000) / 1000;
    const points = eliminated ? 0 : teamPoints(c.difficulty, coverage);
    if (!eliminated) coverages.push(coverage);

    const details: TeamResult["details"] = {
      lighthouse: r?.lighthouse ?? undefined,
      lintErrors: r?.lint_errors ?? undefined,
      auditHigh: r?.audit_high ?? undefined,
      ci: t.signals.ci,
      contributions: t.signals.contributions,
    };
    await db().from("competition_results").upsert(
      {
        team_id: t.id,
        competition_id: c.id,
        hidden_passed: hidden.filter((x) => x.passed).length,
        hidden_total: hidden.length,
        tests: (r?.tests ?? []).slice(0, 80),
        correctness,
        quality,
        teamwork,
        coverage,
        points,
        eliminated: eliminated ?? null,
        details,
      },
      { onConflict: "team_id" },
    );

    // Kişisel puan: katkısı takım ortalamasının yarısının altındaysa oranında azalır, commit'i yoksa 0.
    const ms = members.filter((m) => m.team_id === t.id);
    const commits = ms.map((m) => t.signals.memberCommits?.[m.user_id] ?? 0);
    const avg = commits.length ? commits.reduce((a, b) => a + b, 0) / commits.length : 0;
    for (const [i, m] of ms.entries()) {
      const personal = personalPoints(points, commits[i], avg);
      await db().from("team_members").update({ points: personal, commits: commits[i] }).eq("team_id", t.id).eq("user_id", m.user_id);
      await notify(
        m.user_id,
        eliminated ? `${c.code} sonuçları açıklandı: takımın elendi (${eliminated})` : `${c.code} sonuçları açıklandı: takımın şartnamenin %${Math.round(coverage * 100)}'ini karşıladı, +${personal} puan.`,
        `/yarismalar/${c.id}`,
      );
      if (personal > 0 && coverage >= MIN_COVERAGE)
        await db()
          .from("credentials")
          .upsert({ user_id: m.user_id, kind: "Yarışma", ref: c.id, title: `TLTpulse ${c.code} ${c.title}: şartnamenin %${Math.round(coverage * 100)}'i` }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
    }
  }

  const avg = coverages.length ? coverages.reduce((a, b) => a + b, 0) / coverages.length : 0;
  await db()
    .from("competitions")
    .update({ status: "Tamamlandı", calibration: coverages.length ? calibrationOf(avg) : null })
    .eq("id", c.id);
  for (const uid of new Set(members.map((m) => m.user_id))) await syncScore(uid);
}

/** /api/degerlendirme'den gelen (imzası ve nonce'u doğrulanmış) sonuç. */
export async function applyRun(kind: string, competitionId: string, teamId: string | null, body: { teams?: RunTeamResult[]; validation?: { sample_passed: number; sample_total: number; blank_passed: number } }) {
  const c = await getComp(competitionId);
  if (!c) throw new Error("yarışma yok");
  if (kind === "degerlendirme") {
    if (c.status !== "Değerlendiriliyor") throw new Error("yarışma değerlendirilmiyor");
    await finalize(c, (body.teams ?? []).slice(0, 200));
    return;
  }
  if (kind === "acik") {
    const r = (body.teams ?? []).find((x) => x.team_id === teamId);
    if (!r || !teamId) return;
    const tests = r.tests.filter((x) => x.public).map((x) => ({ title: x.title.slice(0, 200), passed: !!x.passed }));
    await db()
      .from("teams")
      .update({ public_run: { passed: tests.filter((x) => x.passed).length, total: tests.length, reachable: r.reachable, tests }, public_run_at: new Date().toISOString() })
      .eq("id", teamId);
    const ms = await membersOf(competitionId);
    for (const m of ms.filter((x) => x.team_id === teamId)) await notify(m.user_id, `${c.code}: açık testlerin sonucu geldi (${tests.filter((x) => x.passed).length}/${tests.length}).`, `/takim/${teamId}`);
    return;
  }
  if (kind === "dogrulama" && body.validation) {
    const v = body.validation;
    const ok = v.sample_total > 0 && v.sample_passed === v.sample_total && v.blank_passed === 0;
    const spec = ((await db().from("competitions").select("spec").eq("id", competitionId).single()).data as { spec: Record<string, unknown> } | null)?.spec ?? {};
    await db()
      .from("competitions")
      .update({ spec: { ...spec, validation: { ...v, ok, at: new Date().toISOString() } }, tests_verified_at: ok ? new Date().toISOString() : null })
      .eq("id", competitionId);
  }
}

/** Takımın açık testleri kendi demosuna karşı çalıştırması (takım başına günde 3). */
export async function requestPublicRun(teamId: string) {
  const t = (await db().from("teams").select("id, competition_id, demo_url").eq("id", teamId).maybeSingle()).data as { id: string; competition_id: string; demo_url: string | null } | null;
  if (!t) throw new EvalError("Takım bulunamadı.");
  const c = await getComp(t.competition_id);
  if (!c || c.status !== "Devam ediyor") throw new EvalError("Açık testler sadece yarışma devam ederken çalıştırılabilir.");
  if (!t.demo_url) throw new EvalError("Önce teslim bölümünden demo linkini kaydet.");
  await dispatchRun("acik", c.id, { spec_id: c.spec_id, teams: [{ team_id: t.id, demo_url: t.demo_url }] }, t.id);
}
