import "server-only";

import { db } from "./admin";
import { sendPendingCredentials } from "./certifier";
import { endOfDay, formTeams, freezeAndEvaluate, getComp, openQueued, replaceInactive } from "./competition-flow";
import { dispatchRun } from "./evaluation";
import { retryPendingProject } from "./project-eval";
import { closeSeason, openSeason } from "./season";

// Günlük otomatik iş (Vercel Cron, günde bir; yönetici sayfasından elle de çalıştırılabilir).
// Her adım ayrı: biri hata verirse diğerleri yine çalışır. Veritabanına her gün dokunduğu için ücretsiz Supabase
// projesinin 7 gün hareketsizlikte durması da önlenir.

type Report = Record<string, unknown>;

async function step(report: Report, name: string, fn: () => Promise<unknown>) {
  try {
    report[name] = await fn();
  } catch (e) {
    report[name] = { hata: e instanceof Error ? e.message.slice(0, 200) : "hata" };
    console.error(`[günlük] ${name}`, e instanceof Error ? e.message : e);
  }
}

export async function runDaily(): Promise<Report> {
  const report: Report = {};
  const now = Date.now();

  await step(report, "yarismaAc", openQueued);

  await step(report, "takimKur", async () => {
    const due = ((await db().from("competitions").select("id, apply_deadline").eq("status", "Başvurular açık")).data ?? []) as { id: string; apply_deadline: string }[];
    const out: Record<string, unknown> = {};
    for (const c of due.filter((x) => endOfDay(x.apply_deadline).getTime() < now)) out[c.id] = await formTeams(c.id);
    return out;
  });

  await step(report, "yedek", replaceInactive);

  // Örnek (demo) yarışmalar otomatik değerlendirilmez; sunumda yönetici "Şimdi değerlendir" der.
  await step(report, "degerlendir", async () => {
    const due = ((await db().from("competitions").select("id, end_date").eq("status", "Devam ediyor").eq("is_demo", false)).data ?? []) as { id: string; end_date: string }[];
    const out: Record<string, unknown> = {};
    for (const c of due.filter((x) => endOfDay(x.end_date).getTime() < now)) out[c.id] = await freezeAndEvaluate(c.id);
    return out;
  });

  // Sonucu 20 saattir gelmeyen değerlendirme yeniden başlatılır (en fazla 3 deneme).
  await step(report, "takilan", async () => {
    const comps = ((await db().from("competitions").select("id").eq("status", "Değerlendiriliyor")).data ?? []) as { id: string }[];
    const out: string[] = [];
    for (const { id } of comps) {
      const runs = ((await db().from("evaluation_runs").select("id, status, requested_at").eq("competition_id", id).eq("kind", "degerlendirme").order("requested_at", { ascending: false })).data ?? []) as {
        id: string;
        status: string;
        requested_at: string;
      }[];
      const last = runs[0];
      if (!last || last.status !== "Bekliyor" || now - new Date(last.requested_at).getTime() < 20 * 3600_000 || runs.length >= 3) continue;
      await db().from("evaluation_runs").update({ status: "Hata" }).eq("id", last.id);
      const c = await getComp(id);
      const teams = ((await db().from("teams").select("id, demo_url, repo_url, frozen_sha, signals").eq("competition_id", id)).data ?? []) as {
        id: string;
        demo_url: string | null;
        repo_url: string | null;
        frozen_sha: string | null;
        signals: { eliminated?: string };
      }[];
      await dispatchRun("degerlendirme", id, {
        spec_id: c?.spec_id,
        teams: teams.filter((t) => !t.signals.eliminated).map((t) => ({ team_id: t.id, demo_url: t.demo_url, repo: t.repo_url?.replace("https://github.com/", "") ?? null, sha: t.frozen_sha })),
      });
      out.push(id);
    }
    return out;
  });

  await step(report, "sezon", async () => {
    const s = await openSeason();
    if (!s || new Date(s.endsAt).getTime() > now) return "devam";
    return closeSeason(s.id);
  });

  // Gemini kotası dolduğu için "analiz bekliyor" kalan projeler (günde en fazla 10).
  await step(report, "analiz", async () => {
    const rows = ((await db().from("projects").select("id").eq("status", "analiz bekliyor").order("created_at").limit(10)).data ?? []) as { id: string }[];
    const out: Record<string, string> = {};
    for (const r of rows) out[r.id] = await retryPendingProject(r.id);
    return out;
  });

  await step(report, "certifier", () => sendPendingCredentials(20));

  await step(report, "temizlik", async () => {
    const week = new Date(now - 7 * 86400_000).toISOString();
    await db().from("rate_events").delete().lt("created_at", week);
    await db().from("gemini_usage").delete().lt("day", new Date(now - 30 * 86400_000).toISOString().slice(0, 10));
    return "tamam";
  });

  return report;
}
