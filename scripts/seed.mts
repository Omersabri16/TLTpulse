// Demo verisini Supabase'e yükler (HTTPS, secret key). Yeniden çalıştırılabilir: önce eski demo verisini siler.
// Kullanım: node scripts/seed.mts
// Demo hesabının (Deniz) şifresi rastgele üretilir ve .env.local'a DEMO_EMAIL / DEMO_PASSWORD olarak yazılır.
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeScore, DIFFICULTY_POINTS, QUALITY_POINTS } from "../src/lib/score.ts";
import {
  COMPETITIONS,
  DEMO_CERTS,
  DEMO_CONVERSATIONS,
  DEMO_HISTORY,
  DEMO_NOTIFICATIONS,
  DEMO_PEER,
  DEMO_PROFILE,
  DEMO_PROJECTS,
  DEMO_REFERENCES,
  TEAM_CHAT_SEED,
  USERS,
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
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

function ok<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
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

async function main() {
  const people = [
    {
      username: DEMO_PROFILE.username,
      name: DEMO_PROFILE.name,
      field: DEMO_PROFILE.field,
      school: DEMO_PROFILE.school,
      city: DEMO_PROFILE.city,
      score: 61,
      trend: 0,
      about: DEMO_PROFILE.about,
      skills: DEMO_PROFILE.skills.map((s) => s.name),
      interests: DEMO_PROFILE.interests,
      projects: [] as { name: string; techs: string[]; difficulty: "Kolay" | "Orta" | "Zor"; description: string }[],
    },
    ...USERS,
  ];

  // 1) Eski demo kullanıcılarını sil (profiller ve bağlı veri cascade ile gider), yarışmaları sıfırla.
  const existing = await allUsers();
  for (const u of existing.filter((x) => x.email?.endsWith(`@${EMAIL_DOMAIN}`))) ok(await sb.auth.admin.deleteUser(u.id), "eski demo kullanıcısı");
  ok(await sb.from("competitions").delete().in("id", COMPETITIONS.map((c) => c.id)), "eski yarışmalar");

  // 2) Kullanıcılar ve profiller.
  const demoPassword = randomBytes(18).toString("base64url");
  const ids: Record<string, string> = {};
  for (const p of people) {
    const email = `${p.username}@${EMAIL_DOMAIN}`;
    const created = ok(
      await sb.auth.admin.createUser({
        email,
        password: p.username === DEMO_PROFILE.username ? demoPassword : randomBytes(24).toString("base64url"),
        email_confirm: true,
        user_metadata: { name: p.name, demo: true },
      }),
      `kullanıcı ${p.username}`,
    );
    ids[p.username] = created.user!.id;
  }
  const me = ids[DEMO_PROFILE.username];

  ok(
    await sb.from("profiles").insert(
      people.map((p) => {
        const isDemo = p.username === DEMO_PROFILE.username;
        const projectTechs = p.projects.flatMap((x) => x.techs.map((t) => t.toLowerCase()));
        return {
          id: ids[p.username],
          username: p.username,
          name: p.name,
          headline: isDemo ? DEMO_PROFILE.headline : `${p.field} geliştirici`,
          field: p.field,
          school: p.school,
          department: isDemo ? DEMO_PROFILE.department : "Bilgisayar Mühendisliği",
          city: p.city,
          github: "",
          about: p.about,
          interests: p.interests,
          skills: isDemo ? DEMO_PROFILE.skills : p.skills.map((s) => ({ name: s, proof: projectTechs.includes(s.toLowerCase()) ? "Kod" : "Beyan" })),
          education: isDemo ? DEMO_PROFILE.education : [{ school: p.school, department: "Bilgisayar Mühendisliği", start: "", end: "" }],
          cv_code: `TLT-${code(10)}`,
          github_code: `tltpulse-${code(6).toLowerCase()}`,
          score: p.score,
        };
      }),
    ),
    "profiller",
  );

  // 3) Deniz'in deneyimleri (onay hedefi olarak id'leri lazım).
  const expIds: Record<string, string> = {};
  for (const e of DEMO_PROFILE.experiences) {
    const row = ok(
      await sb
        .from("experiences")
        .insert({ user_id: me, kind: e.kind, title: e.title, org: e.org, start_label: e.start, end_label: e.end, description: e.description ?? null })
        .select("id")
        .single(),
      "deneyim",
    );
    expIds[e.id] = (row as { id: string }).id;
  }

  // 4) Projeler.
  const projectRows = [
    ...DEMO_PROJECTS.map((p) => ({
      user_id: me,
      name: p.name,
      repo_owner: REPO_OWNER,
      repo_name: p.name,
      description: p.description,
      techs: p.techs,
      role: p.role,
      language: p.language,
      demo_url: null,
      analysis: p.analysis,
      points: p.analysis.points,
      created_at: new Date(p.addedAt).toISOString(),
    })),
    ...USERS.flatMap((u) =>
      u.projects.map((p, i) => {
        const quality = p.difficulty === "Zor" ? "Çok iyi" : "İyi";
        const points = DIFFICULTY_POINTS[p.difficulty] + QUALITY_POINTS[quality];
        return {
          user_id: ids[u.username],
          name: p.name,
          repo_owner: REPO_OWNER,
          repo_name: `${u.username}-${p.name}`,
          description: p.description.length >= 15 ? p.description : `${p.description} Kişisel proje.`,
          techs: p.techs,
          role: "Tek başıma",
          language: p.techs[0],
          demo_url: null,
          analysis: {
            difficulty: p.difficulty,
            quality,
            authorship: 100,
            commits: 30 + i * 25,
            checks: { readme: true, tests: quality === "Çok iyi", ci: quality === "Çok iyi", demo: false },
            points,
            summary: `${p.techs.length} teknolojiyle ${p.difficulty.toLowerCase()} bir proje.`,
          },
          points,
          created_at: daysAgo(30 + i * 10),
        };
      }),
    ),
  ];
  ok(await sb.from("projects").insert(projectRows), "projeler");

  // 5) Deniz'in sertifikaları ve onayı.
  ok(
    await sb.from("certificates").insert(DEMO_CERTS.map((c) => ({ user_id: me, name: c.name, provider: c.provider, link: c.link, issued_on: c.date, status: c.status, points: c.points }))),
    "sertifikalar",
  );
  ok(
    await sb.from("approvals").insert(
      DEMO_REFERENCES.map((r) => ({
        user_id: me,
        target_type: r.targetType,
        target_id: expIds[r.targetId],
        target_label: r.targetLabel,
        approver_name: r.approverName,
        approver_email: r.approverEmail,
        relation: r.relation,
        status: r.status,
        comment: r.comment ?? null,
        token_hash: createHash("sha256").update(randomBytes(32)).digest("hex"),
        expires_at: daysAgo(-14),
        requested_at: new Date(r.requestedAt).toISOString(),
        answered_at: r.answeredAt ? new Date(r.answeredAt).toISOString() : null,
        points: r.points,
      })),
    ),
    "onaylar",
  );

  // 6) Yarışmalar, takımlar, üyeler, başvurular.
  ok(
    await sb.from("competitions").insert(
      COMPETITIONS.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        tagline: c.tagline,
        theme: c.theme,
        status: c.status,
        description: c.description,
        brief: c.brief,
        deliverables: c.deliverables,
        positions: c.positions.map((p) => ({ field: p.field, perTeam: p.perTeam })),
        apply_deadline: c.applyDeadline,
        start_date: c.start,
        end_date: c.end,
      })),
    ),
    "yarışmalar",
  );
  const teams = COMPETITIONS.flatMap((c) => c.teams);
  if (teams.length) {
    ok(
      await sb.from("teams").insert(
        teams.map((t) => ({
          id: t.id,
          competition_id: t.competitionId,
          name: t.name,
          repo_url: t.repoUrl ?? null,
          submitted_at: t.submitted ? daysAgo(6) : null,
          rank: t.rank ?? null,
          jury_score: t.juryScore ?? null,
        })),
      ),
      "takımlar",
    );
    ok(
      await sb.from("team_members").insert(teams.flatMap((t) => t.members.map((m) => ({ team_id: t.id, competition_id: t.competitionId, user_id: ids[m.username], field: m.field })))),
      "takım üyeleri",
    );
  }
  const apps = COMPETITIONS.filter((c) => c.status === "Başvurular açık").flatMap((c) =>
    USERS.filter((u) => c.positions.some((p) => p.field === u.field)).map((u) => ({ competition_id: c.id, user_id: ids[u.username], field: u.field })),
  );
  if (apps.length) ok(await sb.from("applications").insert(apps), "başvurular");

  // 7) Akran puanları, takım sohbetleri, birebir sohbetler, bildirimler, puan geçmişi, bağlantılar.
  ok(
    await sb.from("peer_ratings").insert(
      DEMO_PEER.map((r) => ({
        competition_id: r.competitionId,
        team_id: COMPETITIONS.find((c) => c.id === r.competitionId)!.teams.find((t) => t.members.some((m) => m.username === DEMO_PROFILE.username))!.id,
        from_user: ids[r.from],
        to_user: me,
        stars: r.stars,
        note: r.note ?? null,
      })),
    ),
    "akran puanları",
  );

  const teamMsgs = Object.entries(TEAM_CHAT_SEED).flatMap(([teamId, lines]) =>
    lines.map((l, i) => ({ team_id: teamId, user_id: l.from === "me" ? me : ids[l.from], text: l.text, created_at: daysAgo(lines.length - i) })),
  );
  if (teamMsgs.length) ok(await sb.from("team_messages").insert(teamMsgs), "takım mesajları");

  for (const c of DEMO_CONVERSATIONS) {
    const [a, b] = [me, ids[c.with]].sort();
    const conv = ok(await sb.from("conversations").insert({ user_a: a, user_b: b }).select("id").single(), "sohbet") as { id: string };
    ok(
      await sb.from("messages").insert(
        c.messages.map((m, i) => ({ conversation_id: conv.id, sender_id: m.from === "me" ? me : ids[m.from], text: m.text, created_at: daysAgo(c.messages.length - i) })),
      ),
      "mesajlar",
    );
  }

  ok(
    await sb.from("notifications").insert(DEMO_NOTIFICATIONS.map((n, i) => ({ user_id: me, text: n.text, href: n.href, read: n.read, created_at: daysAgo(5 + i * 10) }))),
    "bildirimler",
  );

  ok(
    await sb.from("score_events").insert([
      ...DEMO_HISTORY.map((h) => ({ user_id: me, source: h.source, label: h.label, points: h.points, created_at: new Date(h.at).toISOString() })),
      ...USERS.filter((u) => u.trend !== 0).map((u) => ({ user_id: ids[u.username], source: "Projeler", label: "Haftalık ilerleme", points: u.trend, created_at: daysAgo(2) })),
    ]),
    "puan geçmişi",
  );

  const conns = DEMO_PROFILE.connections.flatMap((u) => [
    { user_id: me, other_id: ids[u] },
    { user_id: ids[u], other_id: me },
  ]);
  ok(await sb.from("connections").insert(conns), "bağlantılar");

  // 8) Örnek kullanıcıların puanı: kaynaklardan hesaplanan + seed_points = hedef puan (ligdeki sıralama korunsun).
  const projByUser = new Map<string, { analysis: (typeof projectRows)[number]["analysis"] }[]>();
  for (const r of projectRows) projByUser.set(r.user_id, [...(projByUser.get(r.user_id) ?? []), { analysis: r.analysis }]);
  for (const p of people) {
    const id = ids[p.username];
    const completed = COMPETITIONS.filter((c) => c.status === "Tamamlandı").flatMap((c) => {
      const t = c.teams.find((x) => x.members.some((m) => m.username === p.username));
      return t ? [{ id: c.id, code: c.code, title: c.title, rank: t.rank }] : [];
    });
    const isDemo = p.username === DEMO_PROFILE.username;
    const computed = computeScore({
      projects: projByUser.get(id) ?? [],
      certs: isDemo ? DEMO_CERTS : [],
      references: isDemo ? DEMO_REFERENCES : [],
      peerReceived: isDemo ? DEMO_PEER.map((r) => ({ stars: r.stars, competitionId: r.competitionId })) : [],
      completedCompetitions: completed,
      roadmapDonePoints: 0,
    }).total;
    ok(await sb.from("profiles").update({ seed_points: p.score - computed, score: p.score }).eq("id", id), "puan");
    if (isDemo) console.log(`Deniz hesaplanan puan: ${computed} (hedef ${p.score})`);
  }

  // 9) Demo girişi için .env.local'a yaz.
  let envText = fs.readFileSync(ENV_FILE, "utf8").replace(/^DEMO_(EMAIL|PASSWORD)=.*\r?\n?/gm, "");
  if (!envText.endsWith("\n")) envText += "\n";
  envText += `DEMO_EMAIL=${DEMO_PROFILE.username}@${EMAIL_DOMAIN}\nDEMO_PASSWORD=${demoPassword}\n`;
  fs.writeFileSync(ENV_FILE, envText);

  console.log(`Seed tamam: ${people.length} kullanıcı, ${projectRows.length} proje, ${COMPETITIONS.length} yarışma, ${teams.length} takım.`);
}

main().catch((e) => {
  console.error("Seed hatası:", e instanceof Error ? e.message : e);
  process.exit(1);
});
