// Demo verisini Supabase'e yükler (HTTPS, secret key). Yeniden çalıştırılabilir: önce eski demo verisini siler.
// Kullanım: node scripts/seed.mts        (isteğe bağlı: DEMO_GITHUB=<kullanıcı adı> → Deniz'in GitHub'ı doğrulanmış olarak bağlanır)
// Demo hesabının (Deniz) şifresi rastgele üretilir ve .env.local'a DEMO_EMAIL / DEMO_PASSWORD olarak yazılır.
// Puan defteri: her kalem (proje, sertifika, onay, yarışma, akran, mentor) kaynağının tarihiyle ve o tarihin sezonuyla
// yazılır; sonra sunucunun kullandığı apply_score_items ile karşılaştırılır (fark çıkmamalı).
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  COMPETITION_MAX,
  coverageOf,
  MENTOR_MIN_STARS,
  personalPoints,
  projectPoints,
  qualityLabel,
  promotionCount,
  qualityPoints,
  scoreItems,
  teamPoints,
  type ScoreItem,
} from "../src/lib/score.ts";
import { SPEC_BANK } from "../src/lib/spec-bank.ts";
import type { Level } from "../src/lib/types.ts";
import {
  COMPETITIONS,
  DEMO,
  DEMO_CONVERSATIONS,
  DEMO_NOTIFICATIONS,
  ME_USERNAME,
  projectsFor,
  SEASONS,
  seasonOf,
  USERS,
  type SeedProject,
} from "./seed-data.ts";

const ENV_FILE = new URL("../.env.local", import.meta.url);
const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const EMAIL_DOMAIN = "demo.example.com";
const REPO_OWNER = "tltpulse-ornek"; // örnek projeler gerçek GitHub hesaplarına bağlanmasın
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = (n: number) => Array.from(randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join("");
const fakeSha = (s: string) => createHash("sha1").update(s).digest("hex");
const iso = (d: string, h = 12) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00+03:00`).toISOString();
const DEMO_GITHUB = (process.env.DEMO_GITHUB ?? "").trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ok<T = any>(res: { data: any; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

async function allUsers() {
  const out: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) return out;
  }
}

function analysis(p: SeedProject, commits: number) {
  const q = { ci: !!p.q.ci, demo: !!p.q.demo, readme: !!p.q.readme, commitDays: p.q.days ?? 0 };
  const points = projectPoints({ difficulty: p.difficulty, ...q, importedRatio: 0.1 });
  const qp = qualityPoints(q);
  return {
    points,
    analysis: {
      difficulty: p.difficulty,
      quality: qualityLabel(qp),
      qualityPoints: p.difficulty === "Kolay" ? 0 : qp,
      authorship: 100,
      commits,
      commitDays: q.commitDays,
      ownFiles: p.difficulty === "Zor" ? 64 : p.difficulty === "Orta" ? 31 : 12,
      importedRatio: 0.1,
      checks: { readme: q.readme, tests: q.ci, ci: q.ci, demo: q.demo, days: q.commitDays >= 10 },
      points,
      summary: `${p.techs.join(", ")} ile ${p.difficulty.toLowerCase()} bir proje (örnek veri).`,
    },
  };
}

async function main() {
  const people = [
    { username: DEMO.username, name: DEMO.name, school: DEMO.school, city: DEMO.city, field: DEMO.field, league: DEMO.league, about: DEMO.about, skills: DEMO.skills.map((s) => s.name), interests: DEMO.interests, season: 0, pilot: 0 },
    ...USERS,
  ];

  // 1) Eski demo kullanıcılarını sil (profiller ve bağlı veri cascade ile gider), demo yarışmalarını sıfırla.
  const existing = await allUsers();
  for (const u of existing.filter((x) => x.email?.endsWith(`@${EMAIL_DOMAIN}`))) ok(await sb.auth.admin.deleteUser(u.id), "eski demo kullanıcısı");
  ok(await sb.from("competitions").delete().in("id", ["y-04", ...COMPETITIONS.map((c) => c.id)]), "eski yarışmalar");

  // 2) Sezonlar: iki kapalı deneme sezonu + açık "Sezon 1". Demo sırasında sezon kapatıldıysa geri alınır.
  ok(await sb.from("seasons").upsert(SEASONS.filter((s) => s.id < 1), { onConflict: "id" }), "deneme sezonları");
  ok(await sb.from("score_events").update({ season_id: 1 }).gt("season_id", 1), "sezon taşıma");
  ok(await sb.from("season_results").delete().gte("season_id", 1), "sezon sonuçları");
  ok(await sb.from("seasons").delete().gt("id", 1), "sonraki sezonlar");
  ok(await sb.from("seasons").update({ name: "Sezon 1", starts_at: SEASONS[2].starts_at, ends_at: SEASONS[2].ends_at, closed_at: null }).eq("id", 1), "açık sezon");

  // 3) Kullanıcılar ve profiller.
  const demoPassword = randomBytes(18).toString("base64url");
  const ids: Record<string, string> = {};
  for (const p of people) {
    const created = ok(
      await sb.auth.admin.createUser({
        email: `${p.username}@${EMAIL_DOMAIN}`,
        password: p.username === ME_USERNAME ? demoPassword : randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { name: p.name, demo: true },
      }),
      `kullanıcı ${p.username}`,
    );
    ids[p.username] = created.user!.id;
  }
  const me = ids[ME_USERNAME];
  const leagueOf = new Map(people.map((p) => [p.username, p.league as Level]));

  // Projeler: Deniz'inkiler elle; diğerleri sezon ve deneme puanlarını tam tutturacak şekilde üretilir.
  const projects = new Map<string, SeedProject[]>();
  projects.set(ME_USERNAME, DEMO.projects);
  for (const u of USERS) {
    const list = [...projectsFor(u, u.pilot, "2025-11-01", "2026-09-20", 0), ...projectsFor(u, u.season, "2026-10-01", "2026-10-05", 2)];
    // Aynı kullanıcıda aynı repo adı olmasın.
    const seen = new Map<string, number>();
    for (const p of list) {
      const n = (seen.get(p.name) ?? 0) + 1;
      seen.set(p.name, n);
      if (n > 1) p.name = `${p.name}-${n}`;
    }
    projects.set(u.username, list);
  }

  ok(
    await sb.from("profiles").insert(
      people.map((p) => {
        const isDemo = p.username === ME_USERNAME;
        const techs = (projects.get(p.username) ?? []).flatMap((x) => x.techs.map((t) => t.toLowerCase()));
        return {
          id: ids[p.username],
          username: p.username,
          name: p.name,
          headline: isDemo ? DEMO.headline : `${p.field} geliştirici`,
          field: p.field,
          school: p.school,
          department: isDemo ? DEMO.department : "Bilgisayar Mühendisliği",
          city: p.city,
          github: isDemo ? DEMO_GITHUB : "",
          github_verified: isDemo && !!DEMO_GITHUB,
          about: p.about,
          interests: p.interests,
          skills: isDemo ? DEMO.skills : p.skills.map((s) => ({ name: s, proof: techs.includes(s.toLowerCase()) ? "Kod" : "Beyan" })),
          education: isDemo ? DEMO.education : [{ school: p.school, department: "Bilgisayar Mühendisliği", start: "", end: "" }],
          cv_code: `TLT-${code(10)}`,
          github_code: `tltpulse-${code(6).toLowerCase()}`,
          league: p.league,
          kvkk_accepted_at: new Date().toISOString(),
        };
      }),
    ),
    "profiller",
  );

  // 4) Deniz'in deneyimleri, sertifikaları ve onayı.
  const expIds: Record<string, string> = {};
  for (const e of DEMO.experiences) {
    const row = ok(
      await sb.from("experiences").insert({ user_id: me, kind: e.kind, title: e.title, org: e.org, start_label: e.start, end_label: e.end, description: e.description ?? null }).select("id").single(),
      "deneyim",
    ) as { id: string };
    expIds[e.key] = row.id;
  }
  const certRows = ok(
    await sb
      .from("certificates")
      .insert(DEMO.certs.map((c) => ({ user_id: me, name: c.name, provider: c.provider, link: c.link, issued_on: c.date, status: c.status, points: c.points, created_at: iso(c.date) })))
      .select("id, name, provider, points, issued_on"),
    "sertifikalar",
  ) as { id: string; name: string; provider: string; points: number; issued_on: string }[];
  const apprRows = ok(
    await sb
      .from("approvals")
      .insert(
        DEMO.references.map((r) => ({
          user_id: me,
          target_type: "experience",
          target_id: expIds[r.targetKey],
          target_label: r.targetLabel,
          approver_name: r.approverName,
          approver_email: r.approverEmail,
          relation: r.relation,
          status: "Onaylandı",
          comment: r.comment,
          token_hash: createHash("sha256").update(randomBytes(32)).digest("hex"),
          expires_at: iso(r.requestedAt),
          requested_at: iso(r.requestedAt),
          answered_at: iso(r.answeredAt),
          points: r.points,
        })),
      )
      .select("id, target_label, approver_name, points, status, answered_at"),
    "onaylar",
  ) as { id: string; target_label: string; approver_name: string; points: number; status: string; answered_at: string }[];

  // 5) Projeler.
  const projectRows: Record<string, unknown>[] = [];
  for (const [username, list] of projects)
    list.forEach((p, i) => {
      const a = analysis(p, 20 + i * 17);
      projectRows.push({
        user_id: ids[username],
        name: p.name,
        repo_owner: REPO_OWNER,
        repo_name: `${username}-${p.name}`,
        description: p.description,
        techs: p.techs,
        role: "Tek başıma",
        language: p.techs[0],
        demo_url: null,
        analysis: a.analysis,
        reasons: p.reasons ?? [],
        points: a.points,
        status: "hazır",
        commit_sha: fakeSha(`${username}/${p.name}`),
        analyzed_at: iso(p.at),
        created_at: iso(p.at),
      });
    });
  const projInserted = ok(await sb.from("projects").insert(projectRows).select("id, user_id, name, points, status, created_at"), "projeler") as {
    id: string;
    user_id: string;
    name: string;
    points: number;
    status: string;
    created_at: string;
  }[];

  // 6) Yarışmalar, takımlar, üyeler, sonuçlar, başvurular, akran puanları, takım sohbetleri.
  const memberPoints: { user: string; compId: string; code: string; title: string; points: number; at: string }[] = [];
  const peerByUser = new Map<string, { compId: string; code: string; stars: number[]; from: string[]; at: string }[]>();
  for (const c of COMPETITIONS) {
    const bank = SPEC_BANK.find((s) => s.id === c.specId)!;
    ok(
      await sb.from("competitions").insert({
        id: c.id,
        code: c.code,
        title: bank.title,
        tagline: bank.tagline,
        theme: bank.difficulty,
        status: c.status,
        description: bank.spec.problem,
        brief: bank.spec.stories,
        deliverables: ["Herkese açık GitHub reposu (yarışma başladıktan sonra açılmış)", "Canlı demo linki (https)", "Şartnamedeki API uçları ve data-testid adları"],
        positions: bank.positions.map((field) => ({ field, perTeam: 1 })),
        difficulty: bank.difficulty,
        spec_id: bank.id,
        spec: { ...bank.spec, hiddenCount: bank.hiddenCount },
        tests: bank.publicTests,
        tests_verified_at: new Date().toISOString(),
        publish_on: c.publishOn,
        locked: c.status !== "Taslak",
        calibration: c.calibration ?? null,
        is_demo: c.isDemo,
        apply_deadline: c.applyDeadline,
        start_date: c.start,
        end_date: c.end,
      }),
      `yarışma ${c.id}`,
    );

    for (const t of c.teams) {
      const commits = t.members.map((m) => m.commits);
      const avg = commits.reduce((a, b) => a + b, 0) / commits.length;
      const memberCommits = Object.fromEntries(t.members.map((m) => [ids[m.username], m.commits]));
      const contributions = Object.fromEntries(t.members.map((m) => [m.username, m.commits]));
      const r = t.result;
      let points = 0;
      let coverage = 0;
      let correctness = 0;
      if (r && !r.eliminated) {
        const hidden = r.tests.filter((x) => !x.public);
        correctness = hidden.filter((x) => x.passed).length / hidden.length;
        coverage = Math.round(coverageOf(correctness, r.quality, r.teamwork) * 1000) / 1000;
        points = teamPoints(bank.difficulty, coverage);
      }
      const team = ok(
        await sb
          .from("teams")
          .insert({
            competition_id: c.id,
            name: t.name,
            repo_url: t.repo ?? null,
            demo_url: t.demo ?? null,
            submitted_at: t.repo ? iso(c.end, 20) : null,
            frozen_sha: c.status === "Tamamlandı" && t.repo ? fakeSha(t.repo) : t.demo ? fakeSha(t.repo ?? t.name) : null,
            signals: { ...(t.signals ?? { ci: !!r?.ci, teamwork: r?.teamwork ?? 0 }), memberCommits, contributions, ...(r?.eliminated ? { eliminated: r.eliminated } : {}) },
            created_at: iso(c.applyDeadline, 23),
          })
          .select("id")
          .single(),
        `takım ${t.name}`,
      ) as { id: string };
      (t as { id?: string }).id = team.id;

      ok(
        await sb.from("team_members").insert(
          t.members.map((m) => {
            const personal = c.status === "Tamamlandı" ? personalPoints(points, m.commits, avg) : 0;
            if (c.status === "Tamamlandı") memberPoints.push({ user: ids[m.username], compId: c.id, code: c.code, title: bank.title, points: personal, at: iso(c.end, 22) });
            return { team_id: team.id, competition_id: c.id, user_id: ids[m.username], field: m.field, points: personal, commits: c.status === "Tamamlandı" ? m.commits : null };
          }),
        ),
        "takım üyeleri",
      );

      if (c.status === "Tamamlandı" && r)
        ok(
          await sb.from("competition_results").insert({
            team_id: team.id,
            competition_id: c.id,
            hidden_passed: r.tests.filter((x) => !x.public && x.passed).length,
            hidden_total: r.tests.filter((x) => !x.public).length,
            tests: r.tests,
            correctness,
            quality: r.eliminated ? 0 : r.quality,
            teamwork: r.eliminated ? 0 : r.teamwork,
            coverage,
            points,
            eliminated: r.eliminated ?? null,
            details: { lighthouse: r.lighthouse, lintErrors: r.lint, auditHigh: r.audit, ci: r.ci, contributions },
            created_at: iso(c.end, 22),
          }),
          "sonuç",
        );

      if (t.chat?.length)
        ok(
          await sb.from("team_messages").insert(
            t.chat.map((l, i) => ({ team_id: team.id, user_id: l.from === "me" ? me : ids[l.from], text: l.text, created_at: new Date(Date.now() - (t.chat!.length - i) * 3 * 3600_000).toISOString() })),
          ),
          "takım mesajları",
        );
    }

    if (c.status === "Tamamlandı")
      for (const p of c.peer ?? []) {
        const team = c.teams.find((t) => t.members.some((m) => m.username === p.to)) as { id?: string };
        ok(
          await sb.from("peer_ratings").insert({ competition_id: c.id, team_id: team.id!, from_user: ids[p.from], to_user: ids[p.to], stars: p.stars, note: p.note ?? null, created_at: iso(c.end, 23) }),
          "akran puanı",
        );
        const arr = peerByUser.get(p.to) ?? [];
        const e = arr.find((x) => x.compId === c.id) ?? (arr.push({ compId: c.id, code: c.code, stars: [], from: [], at: iso(c.end, 23) }), arr.at(-1)!);
        e.stars.push(p.stars);
        e.from.push(p.from);
        peerByUser.set(p.to, arr);
      }

    if (c.applicants?.length)
      ok(await sb.from("applications").insert(c.applicants.map((a) => ({ competition_id: c.id, user_id: ids[a.username], field: a.field }))), "başvurular");
    // Takımı olan yarışmalarda üyeler "Takımda" başvuru kaydıyla.
    const members = c.teams.flatMap((t) => t.members);
    if (members.length) ok(await sb.from("applications").insert(members.map((m) => ({ competition_id: c.id, user_id: ids[m.username], field: m.field, status: "Takımda", created_at: iso(c.applyDeadline, 9) }))), "takım başvuruları");
    void COMPETITION_MAX;
  }

  // 7) Birebir sohbetler, bildirimler, bağlantılar.
  for (const c of DEMO_CONVERSATIONS) {
    const [a, b] = [me, ids[c.with]].sort();
    const conv = ok(await sb.from("conversations").insert({ user_a: a, user_b: b }).select("id").single(), "sohbet") as { id: string };
    ok(
      await sb.from("messages").insert(c.messages.map((m, i) => ({ conversation_id: conv.id, sender_id: m.from === "me" ? me : ids[m.from], text: m.text, created_at: new Date(Date.now() - (c.messages.length - i) * 86400_000).toISOString() }))),
      "mesajlar",
    );
  }
  ok(await sb.from("notifications").insert(DEMO_NOTIFICATIONS.map((n, i) => ({ user_id: me, text: n.text, href: n.href, read: n.read, created_at: new Date(Date.now() - (i + 1) * 9 * 3600_000).toISOString() }))), "bildirimler");
  ok(
    await sb.from("connections").insert(
      DEMO.connections.flatMap((u) => [
        { user_id: me, other_id: ids[u] },
        { user_id: ids[u], other_id: me },
      ]),
    ),
    "bağlantılar",
  );

  // 8) Puan defteri: sunucunun hesapladığı kalemlerin aynısı, kaynağın tarihi ve sezonuyla.
  let mismatches = 0;
  for (const p of people) {
    const uid = ids[p.username];
    const myProjects = projInserted.filter((x) => x.user_id === uid);
    const peers = peerByUser.get(p.username) ?? [];
    const league = leagueOf.get(p.username)!;
    const mentor =
      league === "Yeni başlayan"
        ? []
        : peers.filter((x) => {
            const fromNew = x.stars.filter((_, i) => leagueOf.get(x.from[i]) === "Yeni başlayan");
            return fromNew.length && fromNew.reduce((a, b) => a + b, 0) / fromNew.length >= MENTOR_MIN_STARS;
          });
    const isMe = uid === me;
    const items: ScoreItem[] = scoreItems({
      projects: myProjects.map((x) => ({ id: x.id, name: x.name, points: x.points, status: x.status })),
      certs: isMe ? certRows.map((c) => ({ id: c.id, name: c.name, provider: c.provider, points: c.points })) : [],
      approvals: isMe ? apprRows.map((a) => ({ id: a.id, label: a.target_label, approverName: a.approver_name, status: a.status, points: a.points })) : [],
      competitions: memberPoints.filter((m) => m.user === uid).map((m) => ({ id: m.compId, code: m.code, title: m.title, points: m.points })),
      peer: peers.map((x) => ({ competitionId: x.compId, code: x.code, stars: x.stars })),
      mentor: mentor.map((x) => ({ competitionId: x.compId, code: x.code })),
      roadmap: [],
    });
    const when = (ref: string) => {
      const [kind, id] = ref.split(":");
      if (kind === "project") return myProjects.find((x) => x.id === id)!.created_at;
      if (kind === "cert") return iso(certRows.find((x) => x.id === id)!.issued_on);
      if (kind === "approval") return apprRows.find((x) => x.id === id)!.answered_at;
      if (kind === "comp") return memberPoints.find((m) => m.user === uid && m.compId === id)!.at;
      return peers.find((x) => x.compId === id)?.at ?? new Date().toISOString();
    };
    const rows = items
      .filter((i) => i.points)
      .map((i) => {
        const at = when(i.ref);
        return { user_id: uid, source: i.source, label: i.label, points: i.points, ref: i.ref, season_id: seasonOf(at.slice(0, 10)), created_at: at };
      });
    if (rows.length) ok(await sb.from("score_events").insert(rows), "puan defteri");
    const before = rows.length;
    ok(await sb.rpc("apply_score_items", { p_user: uid, p_items: items }), "puan özeti");
    const after = ((await sb.from("score_events").select("id", { count: "exact", head: true }).eq("user_id", uid)).count ?? 0);
    if (after !== before) mismatches++;
    if (mentor.length) ok(await sb.from("badges").insert(mentor.map((m) => ({ user_id: uid, kind: "Mentor", ref: `comp-${m.compId}`, label: `${m.code} mentoru`, created_at: m.at }))), "rozet");
    if (memberPoints.some((m) => m.user === uid && m.points > 0))
      ok(
        await sb.from("credentials").insert(
          memberPoints.filter((m) => m.user === uid && m.points > 0).map((m) => ({ user_id: uid, kind: "Yarışma", ref: m.compId, title: `TLTpulse ${m.code} ${m.title}` })),
        ),
        "sertifika",
      );
  }
  if (mismatches) console.warn(`UYARI: ${mismatches} kullanıcıda seed defteri ile sunucu hesabı farklı.`);

  // 9) Deneme sezonlarının sonuçları (ligler buradan geldi; konfeti gösterilmesin diye görüldü).
  const results: Record<string, unknown>[] = [];
  for (const p of people) {
    const uid = ids[p.username];
    if (p.league === "Kıdemli") {
      results.push({ season_id: -1, user_id: uid, from_league: "Yeni başlayan", to_league: "Orta", season_points: 180, rank: 5, seen: true });
      results.push({ season_id: 0, user_id: uid, from_league: "Orta", to_league: "Kıdemli", season_points: 260, rank: 8, seen: true });
    } else if (p.league === "Orta") results.push({ season_id: 0, user_id: uid, from_league: "Yeni başlayan", to_league: "Orta", season_points: 140, rank: 12, seen: true });
  }
  ok(await sb.from("season_results").insert(results), "sezon sonuçları");

  // 10) Gerçek (demo olmayan) kullanıcıların özetleri: sezon taşındıysa güncellensin.
  const real = ((await sb.from("profiles").select("id")).data ?? []) as { id: string }[];
  for (const r of real.filter((x) => !Object.values(ids).includes(x.id))) {
    const ev = ((await sb.from("score_events").select("points, season_id, created_at").eq("user_id", r.id)).data ?? []) as { points: number; season_id: number; created_at: string }[];
    const cur = ev.filter((e) => e.season_id === 1);
    await sb
      .from("profiles")
      .update({ score: ev.reduce((a, e) => a + e.points, 0), season_points: cur.reduce((a, e) => a + e.points, 0), season_points_at: cur.map((e) => e.created_at).sort().at(-1) ?? null })
      .eq("id", r.id);
  }

  // 11) Demo girişi için .env.local'a yaz.
  let envText = fs.readFileSync(ENV_FILE, "utf8").replace(/^DEMO_(EMAIL|PASSWORD)=.*\r?\n?/gm, "");
  if (!envText.endsWith("\n")) envText += "\n";
  envText += `DEMO_EMAIL=${ME_USERNAME}@${EMAIL_DOMAIN}\nDEMO_PASSWORD=${demoPassword}\n`;
  fs.writeFileSync(ENV_FILE, envText);

  // Kontrol: Deniz Orta ligde kaçıncı?
  const orta = ((await sb.from("profiles").select("username, season_points, season_points_at").eq("league", "Orta").order("season_points", { ascending: false }).order("season_points_at", { ascending: true })).data ?? []) as {
    username: string;
    season_points: number;
  }[];
  const rank = orta.findIndex((x) => x.username === ME_USERNAME) + 1;
  console.log(`Deniz: Orta lig ${rank}. / ${orta.length}, sezon puanı ${orta[rank - 1]?.season_points}; yükselme çizgisi ${promotionCount(orta.length)}. sırada (${orta[promotionCount(orta.length) - 1]?.season_points}).`);
  console.log(`Seed tamam: ${people.length} kullanıcı, ${projectRows.length} proje, ${COMPETITIONS.length} yarışma.`);
}

main().catch((e) => {
  console.error("Seed hatası:", e instanceof Error ? e.message : e);
  process.exit(1);
});
