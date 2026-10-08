import "server-only";

import { COPY_RATIO, projectPoints, qualityLabel, qualityPoints, importPenalized, MIN_COMMIT_DAYS } from "@/lib/score";
import type { Difficulty, ProjectAnalysis } from "@/lib/types";
import { db } from "./admin";
import { classifyDifficulty } from "./ai-difficulty";
import { meaningfulReadme, ownership, repoFacts, type RepoFacts } from "./github";
import { syncScore } from "./me";
import { notify } from "./notify";
import { urlOpens } from "./safe-fetch";

// Proje değerlendirmesi (kararlar.md Bölüm 5): eleme → kopya → şablon → içe aktarılmış kod → AI zorluk → kural kalite → puan.

export type RejectKind = "kopya" | "şablon" | "fork" | "yazarlık" | "erişim";

export type EvalOutcome =
  | { ok: true; pending: boolean; facts: RepoFacts; analysis: ProjectAnalysis; fileShas: string[] }
  | { ok: false; kind: RejectKind; reason: string };

async function templateShas(shas: string[]) {
  if (!shas.length) return new Set<string>();
  const r = await db().rpc("template_shas", { p_shas: shas });
  if (r.error) throw new Error(`şablon: ${r.error.message}`);
  return new Set((r.data ?? []) as string[]);
}

async function overlap(shas: string[], exclude: string | null) {
  if (!shas.length) return null;
  const r = await db().rpc("project_overlap", { p_shas: shas, p_exclude: exclude });
  if (r.error) throw new Error(`kopya: ${r.error.message}`);
  const row = ((r.data ?? []) as { project_id: string; user_id: string; shared: number }[])[0];
  return row ? { projectId: row.project_id, userId: row.user_id, shared: Number(row.shared) } : null;
}

function summaryOf(d: Difficulty | null, a: Omit<ProjectAnalysis, "summary" | "points" | "difficulty" | "quality" | "qualityPoints" | "reasons">) {
  const plus: string[] = [];
  const minus: string[] = [];
  (a.checks.tests ? plus : minus).push("CI'da yeşil testler");
  (a.checks.demo ? plus : minus).push("açılan demo");
  (a.checks.readme ? plus : minus).push("anlamlı README");
  (a.checks.days ? plus : minus).push(`${MIN_COMMIT_DAYS}+ günlük geliştirme`);
  const head = d ? `${a.ownFiles} kendi kaynak dosyası, ${a.commits} commit; AI zorluğu ${d.toLowerCase()} buldu.` : `${a.ownFiles} kendi kaynak dosyası, ${a.commits} commit; zorluk analizi bekliyor.`;
  const imported = d && importPenalized(d, a.importedRatio) ? ` Kodun %${Math.round(a.importedRatio * 100)}'i ilk commit'le gelmiş, puan sonradan yazılan kısmın oranıyla çarpıldı.` : "";
  const quality = d === "Kolay" ? " Kolay projede kalite puana eklenmez." : (plus.length ? ` Artılar: ${plus.join(", ")}.` : "") + (minus.length ? ` Eksik: ${minus.join(", ")}.` : "");
  return head + imported + quality;
}

/** `exclude`: yeniden analizde projenin kendi dosyaları kopya kontrolüne girmesin. */
export async function evaluateProject(owner: string, repo: string, opts: { userId: string; githubUser: string; demoUrl?: string; exclude?: string | null }): Promise<EvalOutcome> {
  const fr = await repoFacts(owner, repo, opts.githubUser);
  if (!fr.ok) return { ok: false, kind: fr.kind, reason: fr.reason };
  const f = fr.facts;

  const allShas = [...new Set(f.files.map((x) => x.sha))];
  const templates = await templateShas(allShas);
  const own = ownership(f.files, templates, f.firstCommit);
  if (!own.enough)
    return {
      ok: false,
      kind: "şablon",
      reason: "Bu repoda şablon ve üretilmiş dosyalar dışında kendi yazdığın bir kaynak dosyası yok.",
    };

  const ownShas = [...new Set(own.own.map((x) => x.sha))];
  const o = await overlap(ownShas, opts.exclude ?? null);
  if (o && o.shared / ownShas.length >= COPY_RATIO)
    return {
      ok: false,
      kind: "kopya",
      reason:
        o.userId === opts.userId
          ? `Bu kodun büyük kısmı (%${Math.round((o.shared / ownShas.length) * 100)}) zaten eklediğin başka bir projende var. Aynı kod iki kez puan almaz.`
          : `Bu kodun büyük kısmı (%${Math.round((o.shared / ownShas.length) * 100)}) sistemdeki başka bir projede var. Kopya kod puan almaz.`,
    };

  const [demo, diff] = await Promise.all([opts.demoUrl ? urlOpens(opts.demoUrl) : Promise.resolve(false), classifyDifficulty(f, own.own)]);
  const readme = meaningfulReadme(f.readme, templates);
  const base = {
    authorship: f.authorship,
    commits: f.commits,
    commitDays: f.commitDays,
    ownFiles: own.source.length,
    importedRatio: Math.round(own.importedRatio * 100) / 100,
    checks: { readme, tests: f.ciGreen, ci: f.hasCi, demo, days: f.commitDays >= MIN_COMMIT_DAYS },
    commitSha: f.sha,
  };
  const qp = qualityPoints({ ci: f.ciGreen, demo, readme, commitDays: f.commitDays });
  const difficulty = diff?.difficulty ?? "Kolay";
  const analysis: ProjectAnalysis = {
    ...base,
    difficulty,
    quality: qualityLabel(qp),
    qualityPoints: difficulty === "Kolay" ? 0 : qp,
    points: diff ? projectPoints({ difficulty, ci: f.ciGreen, demo, readme, commitDays: f.commitDays, importedRatio: own.importedRatio }) : 0,
    summary: summaryOf(diff?.difficulty ?? null, base),
    reasons: diff?.reasons ?? [],
  };
  return { ok: true, pending: !diff, facts: f, analysis, fileShas: allShas };
}

/** Projenin dosya özetlerini yazar (yeniden analizde eskileri silinir). */
export async function saveProjectFiles(projectId: string, userId: string, shas: string[]) {
  await db().from("project_files").delete().eq("project_id", projectId);
  for (let i = 0; i < shas.length; i += 1000) {
    const r = await db()
      .from("project_files")
      .insert(shas.slice(i, i + 1000).map((blob_sha) => ({ project_id: projectId, user_id: userId, blob_sha })));
    if (r.error) throw new Error(`dosya özetleri: ${r.error.message}`);
  }
}

export const projectRow = (facts: RepoFacts, analysis: ProjectAnalysis, pending: boolean) => ({
  techs: facts.techs.length ? facts.techs : [facts.language || "Kod"],
  role: facts.role,
  language: facts.language,
  analysis: { ...analysis, reasons: undefined },
  reasons: analysis.reasons,
  points: analysis.points,
  status: pending ? "analiz bekliyor" : "hazır",
  commit_sha: facts.sha,
  analyzed_at: new Date().toISOString(),
});

/** "Analiz bekliyor" projeyi tekrar dener (günlük iş ve kullanıcı). Sahiplik çağıranda kontrol edilir. */
export async function retryPendingProject(projectId: string): Promise<"yok" | "red" | "bekliyor" | "tamam"> {
  const cur = (await db().from("projects").select("id, user_id, name, repo_owner, repo_name, demo_url, status").eq("id", projectId).maybeSingle()).data as {
    id: string;
    user_id: string;
    name: string;
    repo_owner: string;
    repo_name: string;
    demo_url: string | null;
    status: string;
  } | null;
  if (!cur || cur.status !== "analiz bekliyor") return "yok";
  const prof = (await db().from("profiles").select("github").eq("id", cur.user_id).single()).data as { github: string } | null;
  if (!prof?.github) return "yok";
  const res = await evaluateProject(cur.repo_owner, cur.repo_name, { userId: cur.user_id, githubUser: prof.github, demoUrl: cur.demo_url ?? undefined, exclude: cur.id });
  if (!res.ok) {
    // Bu arada repo silindiyse ya da kopya çıktıysa proje puansız kalır; kullanıcı bilgilendirilir.
    await notify(cur.user_id, `${cur.name} analiz edilemedi: ${res.reason}`, "/projeler");
    await db().from("projects").update({ status: "hazır", points: 0 }).eq("id", cur.id);
    return "red";
  }
  if (res.pending) return "bekliyor";
  await db().from("projects").update(projectRow(res.facts, res.analysis, false)).eq("id", cur.id);
  await saveProjectFiles(cur.id, cur.user_id, res.fileShas);
  await syncScore(cur.user_id);
  await notify(cur.user_id, `${cur.name} analizi bitti: ${res.analysis.difficulty}, +${res.analysis.points} puan.`, "/projeler");
  return "tamam";
}

