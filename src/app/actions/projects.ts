"use server";

import { z } from "zod";
import { certKey, parseRepoUrl } from "@/lib/score";
import { check, run, UserError, url } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { verifyCertificate } from "@/lib/server/cert-verify";
import { GitHubError, headCommit, repoInfo } from "@/lib/server/github";
import { loadMe, syncScore } from "@/lib/server/me";
import { notify } from "@/lib/server/notify";
import { evaluateProject, projectRow, retryPendingProject, saveProjectFiles, type RejectKind } from "@/lib/server/project-eval";
import { allow } from "@/lib/server/rate";
import type { ProjectAnalysis, Skill } from "@/lib/types";

const ProjectInput = z.object({
  repoUrl: z.string().trim().max(200),
  name: z.string().trim().min(1, "Proje adını yaz.").max(80),
  description: z.string().trim().min(15, "Projeyi bir cümleyle anlat (en az 15 karakter).").max(500, "Açıklama en fazla 500 karakter olabilir."),
  demoUrl: z.union([url, z.literal("")]).optional(),
});

async function githubOf(userId: string) {
  const p = check(await db().from("profiles").select("github, github_verified").eq("id", userId).single(), "profil") as { github: string; github_verified: boolean };
  if (!p.github) throw new UserError("Önce profiline GitHub kullanıcı adını ekle.");
  if (!p.github_verified) throw new UserError("Önce GitHub hesabını doğrula (Profili düzenle → GitHub).");
  return p.github;
}

const like = (s: string) => s.replace(/[\\%_]/g, "\\$&");

async function analyze(userId: string, input: z.input<typeof ProjectInput>) {
  const v = ProjectInput.parse(input);
  const repo = parseRepoUrl(v.repoUrl);
  if (!repo) throw new UserError("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
  const github = await githubOf(userId);
  const dup = await db().from("projects").select("id").eq("user_id", userId).ilike("repo_owner", like(repo.owner)).ilike("repo_name", like(repo.repo)).maybeSingle();
  if (dup.data) throw new UserError("Bu proje zaten ekli.");
  if (!(await allow(userId, "project_analyze", 40, 1))) throw new UserError("Bir saatte çok fazla analiz yaptın. Biraz sonra tekrar dene.");
  const res = await evaluateProject(repo.owner, repo.repo, { userId, githubUser: github, demoUrl: v.demoUrl || undefined });
  return { v, res };
}

export type PreviewResult =
  | { ok: true; pending: boolean; analysis: ProjectAnalysis; techs: string[]; role: string; repo: string }
  | { ok: false; kind: RejectKind; reason: string };

/** Önizleme: analiz sonucunu gösterir, kaydetmez. */
export async function previewProject(input: z.input<typeof ProjectInput>) {
  return run(async (): Promise<PreviewResult> => {
    const user = await requireUser();
    const { res } = await analyze(user.id, input);
    return res.ok
      ? { ok: true, pending: res.pending, analysis: res.analysis, techs: res.facts.techs, role: res.facts.role, repo: `${res.facts.owner}/${res.facts.repo}` }
      : { ok: false, kind: res.kind, reason: res.reason };
  });
}

/** Projede kullanılan teknolojiler "Kod" kanıtlı beceri olur. */
async function proveSkills(userId: string, techs: string[]) {
  const prof = check(await db().from("profiles").select("skills").eq("id", userId).single(), "profil") as { skills: Skill[] };
  const skills = [...prof.skills];
  for (const t of techs) {
    const i = skills.findIndex((k) => k.name.toLowerCase() === t.toLowerCase());
    if (i === -1) skills.push({ name: t, proof: "Kod" });
    else if (skills[i].proof === "Beyan") skills[i] = { name: skills[i].name, proof: "Kod" };
  }
  await db().from("profiles").update({ skills: skills.slice(0, 40) }).eq("id", userId);
}

/** Ekleme: analiz sunucuda yeniden yapılır (AI sonucu commit önbelleğinden); istemcinin gördüğü sonuç kaydedilmez. */
export async function addProject(input: z.input<typeof ProjectInput>) {
  return run(async () => {
    const user = await requireUser();
    const { v, res } = await analyze(user.id, input);
    if (!res.ok) throw new UserError(res.reason);
    const count = (await db().from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id)).count ?? 0;
    if (count >= 50) throw new UserError("En fazla 50 proje ekleyebilirsin.");

    const row = check(
      await db()
        .from("projects")
        .insert({
          user_id: user.id,
          name: v.name,
          repo_owner: res.facts.owner,
          repo_name: res.facts.repo,
          description: v.description,
          demo_url: v.demoUrl || null,
          ...projectRow(res.facts, res.analysis, res.pending),
        })
        .select("id")
        .single(),
      "proje ekleme",
    ) as { id: string };
    await saveProjectFiles(row.id, user.id, res.fileShas);
    await proveSkills(user.id, res.facts.techs);
    if (res.pending) await notify(user.id, `${v.name} eklendi; zorluk analizi bitince puanı yazılacak.`, "/projeler");
    return { points: res.analysis.points, pending: res.pending, me: await loadMe(user.id, user.email) };
  });
}

/** Repoya yeni commit geldiyse yeniden analiz; puan farkı o anki sezona yazılır. */
export async function reanalyzeProject(id: string) {
  return run(async () => {
    const user = await requireUser();
    const pid = z.string().uuid().parse(id);
    const cur = (await db().from("projects").select("id, name, repo_owner, repo_name, demo_url, commit_sha, points, status").eq("id", pid).eq("user_id", user.id).maybeSingle())
      .data as { id: string; name: string; repo_owner: string; repo_name: string; demo_url: string | null; commit_sha: string | null; points: number; status: string } | null;
    if (!cur) throw new UserError("Bu proje bulunamadı.");
    const github = await githubOf(user.id);
    if (!(await allow(user.id, "project_analyze", 40, 1))) throw new UserError("Bir saatte çok fazla analiz yaptın. Biraz sonra tekrar dene.");
    if (cur.status === "hazır" && cur.commit_sha) {
      try {
        const info = await repoInfo(cur.repo_owner, cur.repo_name);
        const head = await headCommit(info.owner, info.repo, info.defaultBranch);
        if (head.sha === cur.commit_sha) throw new UserError("Son analizden beri repoya yeni commit gelmemiş.");
      } catch (e) {
        if (e instanceof UserError) throw e;
        throw new UserError(e instanceof GitHubError ? e.message : "GitHub'a ulaşılamadı. Biraz sonra tekrar dene.");
      }
    }
    const res = await evaluateProject(cur.repo_owner, cur.repo_name, { userId: user.id, githubUser: github, demoUrl: cur.demo_url ?? undefined, exclude: pid });
    if (!res.ok) throw new UserError(`Yeniden analiz edilemedi: ${res.reason}`);
    check(await db().from("projects").update(projectRow(res.facts, res.analysis, res.pending)).eq("id", pid), "proje güncelleme");
    await saveProjectFiles(pid, user.id, res.fileShas);
    await proveSkills(user.id, res.facts.techs);
    await syncScore(user.id);
    return { before: cur.points, after: res.analysis.points, pending: res.pending, me: await loadMe(user.id, user.email) };
  });
}

export async function retryMyProject(id: string) {
  return run(async () => {
    const user = await requireUser();
    const pid = z.string().uuid().parse(id);
    const own = await db().from("projects").select("id").eq("id", pid).eq("user_id", user.id).maybeSingle();
    if (!own.data) throw new UserError("Bu proje bulunamadı.");
    if (!(await allow(user.id, "project_analyze", 40, 1))) throw new UserError("Bir saatte çok fazla analiz yaptın. Biraz sonra tekrar dene.");
    const r = await retryPendingProject(pid);
    if (r === "bekliyor") throw new UserError("Zorluk analizi şu an yapılamadı. Günlük iş yarın tekrar deneyecek.");
    return loadMe(user.id, user.email);
  });
}

export async function removeProject(id: string) {
  return run(async () => {
    const user = await requireUser();
    const pid = z.string().uuid().parse(id);
    check(await db().from("approvals").delete().eq("user_id", user.id).eq("target_type", "project").eq("target_id", pid), "onay silme");
    check(await db().from("projects").delete().eq("id", pid).eq("user_id", user.id), "proje silme");
    // Projenin puanı defterden geri alınır (aynı repoyu silip yeniden ekleyerek puan toplanamaz).
    await syncScore(user.id);
    return loadMe(user.id, user.email);
  });
}

const CertInput = z.object({
  name: z.string().trim().min(2, "Sertifikanın adını yaz.").max(120),
  provider: z.enum(["BTK Akademi", "Credly", "Coursera", "Udemy", "Diğer"]),
  link: url,
});

/** Sertifika kaynaktan doğrulanır: isim kaynaktan okunur, kullanıcının yazdığına güvenilmez. */
async function verifyFor(userId: string, email: string, v: z.output<typeof CertInput>) {
  const key = certKey(v.provider, v.link);
  if (!key) throw new UserError("Bu sertifika linki okunamadı. Doğrulama sayfasının linkini yapıştır.");
  // Sertifikayı sadece doğrulanmış ya da onaylanmış kayıt kilitler: isim tutmadığı için 0 puanla eklenen bir kayıt,
  // gerçek sahibinin kendi sertifikasını eklemesini engellemesin.
  const rows = (check(await db().from("certificates").select("user_id, status").eq("cert_key", key), "sertifika") ?? []) as { user_id: string; status: string }[];
  if (rows.some((r) => r.user_id === userId)) throw new UserError("Bu sertifika zaten ekli.");
  if (rows.some((r) => r.status === "Doğrulandı" || r.status === "Onaylandı")) throw new UserError("Bu sertifika başka bir hesapta doğrulanmış.");
  if (!(await allow(userId, "cert_check", 30, 1))) throw new UserError("Bir saatte çok fazla sertifika denedin. Biraz sonra tekrar dene.");
  const p = check(await db().from("profiles").select("name").eq("id", userId).single(), "profil") as { name: string };
  const res = await verifyCertificate(v.provider, v.link, { name: p.name, email });
  if (!res.ok) throw new UserError(res.reason);
  return { key, status: res.status, points: res.points };
}

/** Önizleme: doğrulama sonucunu gösterir, kaydetmez. */
export async function checkCertificate(input: z.input<typeof CertInput>) {
  return run(async () => {
    const user = await requireUser();
    const { status, points } = await verifyFor(user.id, user.email, CertInput.parse(input));
    return { status, points };
  });
}

/** Ekleme: doğrulama sunucuda yeniden yapılır; istemcinin gördüğü sonuç kaydedilmez. */
export async function addCertificate(input: z.input<typeof CertInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = CertInput.parse(input);
    const count = (await db().from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id)).count ?? 0;
    if (count >= 30) throw new UserError("En fazla 30 sertifika ekleyebilirsin.");
    const res = await verifyFor(user.id, user.email, v);
    const ins = await db().from("certificates").insert({ user_id: user.id, name: v.name, provider: v.provider, link: v.link, cert_key: res.key, status: res.status, points: res.points });
    if (ins.error?.code === "23505") throw new UserError("Bu sertifika zaten eklenmiş.");
    check(ins, "sertifika");
    await syncScore(user.id);
    return { points: res.points, status: res.status, me: await loadMe(user.id, user.email) };
  });
}
