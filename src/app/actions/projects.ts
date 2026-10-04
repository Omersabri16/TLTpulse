"use server";

import { z } from "zod";
import { parseRepoUrl, verifyCertificate } from "@/lib/score";
import { check, run, text, UserError, url } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { analyzeRepo } from "@/lib/server/github";
import { loadMe } from "@/lib/server/me";
import { scoreEvent } from "@/lib/server/notify";
import { allow } from "@/lib/server/rate";
import type { Skill } from "@/lib/types";

const ProjectInput = z.object({
  repoUrl: z.string().trim().max(200),
  name: z.string().trim().min(1, "Proje adını yaz.").max(80),
  description: z.string().trim().min(15, "Projeyi bir cümleyle anlat (en az 15 karakter).").max(500, "Açıklama en fazla 500 karakter olabilir."),
  techs: z.array(z.string().trim().min(1).max(40)).min(1, "En az bir teknoloji ekle.").max(12, "En fazla 12 teknoloji ekleyebilirsin."),
  role: z.enum(["Tek başıma", "Takımla"]),
  demoUrl: z.union([url, z.literal("")]).optional(),
});

async function analyze(userId: string, input: z.input<typeof ProjectInput>) {
  const v = ProjectInput.parse(input);
  const repo = parseRepoUrl(v.repoUrl);
  if (!repo) throw new UserError("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
  const p = check(await db().from("profiles").select("github, github_verified").eq("id", userId).single(), "profil") as { github: string; github_verified: boolean };
  if (!p.github) throw new UserError("Önce profiline GitHub kullanıcı adını ekle.");
  if (!p.github_verified) throw new UserError("Önce GitHub hesabını doğrula (Profili düzenle → GitHub).");
  const like = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const dup = await db().from("projects").select("id").eq("user_id", userId).ilike("repo_owner", like(repo.owner)).ilike("repo_name", like(repo.repo)).maybeSingle();
  if (dup.data) throw new UserError("Bu proje zaten ekli.");
  if (!(await allow(userId, "project_analyze", 40, 1))) throw new UserError("Bir saatte çok fazla analiz yaptın. Biraz sonra tekrar dene.");
  const res = await analyzeRepo(repo.owner, repo.repo, { githubUser: p.github, techs: v.techs.length, role: v.role, demoUrl: v.demoUrl || undefined });
  return { v, repo, res };
}

/** Önizleme: analiz sonucunu gösterir, kaydetmez. */
export async function previewProject(input: z.input<typeof ProjectInput>) {
  return run(async () => {
    const user = await requireUser();
    const { res } = await analyze(user.id, input);
    return res.ok ? { ok: true as const, analysis: res.analysis } : { ok: false as const, reason: res.reason, authorship: res.authorship };
  });
}

/** Ekleme: analiz sunucuda yeniden yapılır; istemcinin gördüğü sonuç kaydedilmez. */
export async function addProject(input: z.input<typeof ProjectInput>) {
  return run(async () => {
    const user = await requireUser();
    const { v, repo, res } = await analyze(user.id, input);
    if (!res.ok) throw new UserError(res.reason);
    const count = (await db().from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id)).count ?? 0;
    if (count >= 50) throw new UserError("En fazla 50 proje ekleyebilirsin.");

    check(
      await db()
        .from("projects")
        .insert({
          user_id: user.id,
          name: v.name,
          repo_owner: repo.owner,
          repo_name: repo.repo,
          description: v.description,
          techs: v.techs,
          role: v.role,
          language: res.language || v.techs[0],
          demo_url: v.demoUrl || null,
          analysis: res.analysis,
          points: res.analysis.points,
        }),
      "proje ekleme",
    );

    // Projede kullanılan teknolojiler "Kod" kanıtlı beceri olur.
    const prof = check(await db().from("profiles").select("skills").eq("id", user.id).single(), "profil") as { skills: Skill[] };
    const skills = [...prof.skills];
    for (const t of v.techs) {
      const i = skills.findIndex((k) => k.name.toLowerCase() === t.toLowerCase());
      if (i === -1) skills.push({ name: t, proof: "Kod" });
      else if (skills[i].proof === "Beyan") skills[i] = { name: skills[i].name, proof: "Kod" };
    }
    await db().from("profiles").update({ skills: skills.slice(0, 40) }).eq("id", user.id);
    await scoreEvent(user.id, "Projeler", `${v.name} eklendi`, res.analysis.points);
    return { points: res.analysis.points, me: await loadMe(user.id, user.email) };
  });
}

export async function removeProject(id: string) {
  return run(async () => {
    const user = await requireUser();
    const pid = z.string().uuid().parse(id);
    check(await db().from("approvals").delete().eq("user_id", user.id).eq("target_type", "project").eq("target_id", pid), "onay silme");
    check(await db().from("projects").delete().eq("id", pid).eq("user_id", user.id), "proje silme");
    return loadMe(user.id, user.email);
  });
}

const CertInput = z.object({
  name: z.string().trim().min(2, "Sertifikanın adını yaz.").max(120),
  provider: z.enum(["BTK Akademi", "Credly", "Coursera", "Udemy", "Diğer"]),
  link: url,
  nameOnCert: text(80).optional(),
});

/** Doğrulama sonucu ve puan sunucuda belirlenir. */
export async function checkCertificate(input: z.input<typeof CertInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = CertInput.parse(input);
    const p = check(await db().from("profiles").select("name").eq("id", user.id).single(), "profil") as { name: string };
    return verifyCertificate(v.provider, v.link, v.nameOnCert ?? "", p.name);
  });
}

export async function addCertificate(input: z.input<typeof CertInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = CertInput.parse(input);
    const p = check(await db().from("profiles").select("name").eq("id", user.id).single(), "profil") as { name: string };
    const dup = await db().from("certificates").select("id").eq("user_id", user.id).eq("link", v.link).maybeSingle();
    if (dup.data) throw new UserError("Bu sertifika zaten ekli.");
    const count = (await db().from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id)).count ?? 0;
    if (count >= 30) throw new UserError("En fazla 30 sertifika ekleyebilirsin.");
    const res = verifyCertificate(v.provider, v.link, v.nameOnCert ?? "", p.name);
    check(await db().from("certificates").insert({ user_id: user.id, name: v.name, provider: v.provider, link: v.link, status: res.status, points: res.points }), "sertifika");
    await scoreEvent(user.id, "Sertifikalar", `${v.provider} · ${v.name}`, res.points);
    return { points: res.points, me: await loadMe(user.id, user.email) };
  });
}
