"use server";

import { z } from "zod";
import { TEAM_FIELDS } from "@/lib/score";
import { bankSpec } from "@/lib/spec-bank";
import { check, run, text, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { draftSpec, generateTests } from "@/lib/server/ai-spec";
import { requireAdmin } from "@/lib/server/auth";
import { formTeams, freezeAndEvaluate, getComp, todayTR } from "@/lib/server/competition-flow";
import { runDaily } from "@/lib/server/daily";
import { dispatchRun, EvalError, pushTestFile } from "@/lib/server/evaluation";
import { QuotaError } from "@/lib/server/gemini";
import { notify } from "@/lib/server/notify";
import { closeSeason, openSeason } from "@/lib/server/season";
import type { CompetitionSpec } from "@/lib/types";

// Yönetici (kararlar.md Bölüm 5, "Yönetici"): yarışmayı tanımlar, sıraya koyar, iptal eder, şikayetlere bakar.
// Puana ve sonuca dokunamaz, takımı elle kuramaz (takımları kod kurar). Her aksiyon requireAdmin ile başlar.

const CompId = z.string().regex(/^y-[0-9]{2,4}$/, "Geçersiz yarışma.");
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG olmalı.");
const DIFF = z.enum(["Kolay", "Orta", "Zor"]);

const SpecSchema = z.object({
  problem: z.string().trim().min(20).max(800),
  stories: z.array(z.string().trim().min(3).max(200)).min(1).max(10),
  api: z
    .array(z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), path: z.string().max(80), request: z.string().max(300).optional(), response: z.string().max(300), note: z.string().max(200).optional() }))
    .max(15),
  testIds: z.array(z.object({ page: z.string().max(60), id: z.string().max(200), note: z.string().max(200) })).max(12),
  rules: z.array(z.string().max(200)).max(8),
});

const CreateInput = z
  .object({
    title: z.string().trim().min(3, "Başlık yaz.").max(60),
    tagline: text(120),
    difficulty: DIFF,
    specId: z.string().regex(/^[a-z0-9-]{3,40}$/).optional(),
    spec: SpecSchema.optional(),
    publishOn: Day,
    applyDeadline: Day,
    start: Day,
    end: Day,
  })
  .refine((v) => v.publishOn <= v.applyDeadline && v.applyDeadline < v.start && v.start < v.end, "Tarih sırası: yayın ≤ son başvuru < başlangıç < teslim.")
  .refine((v) => v.specId || v.spec, "Bankadan bir şartname seç ya da taslak oluştur.");

async function nextId() {
  const ids = ((await db().from("competitions").select("id")).data ?? []) as { id: string }[];
  const n = Math.max(0, ...ids.map((r) => Number(r.id.slice(2)) || 0)) + 1;
  return { id: `y-${String(n).padStart(2, "0")}`, code: `Y-${String(n).padStart(2, "0")}` };
}

export async function createCompetition(input: z.input<typeof CreateInput>) {
  return run(async () => {
    await requireAdmin();
    const v = CreateInput.parse(input);
    const bank = bankSpec(v.specId);
    if (v.specId && !bank && !v.spec) throw new UserError("Bu şartname bankada yok.");
    const spec: CompetitionSpec & { hiddenCount?: number } = bank ? { ...bank.spec, hiddenCount: bank.hiddenCount } : v.spec!;
    const { id, code } = await nextId();
    check(
      await db()
        .from("competitions")
        .insert({
          id,
          code,
          title: v.title,
          tagline: v.tagline || bank?.tagline || "",
          theme: v.difficulty,
          status: "Taslak",
          description: spec.problem,
          brief: spec.stories,
          deliverables: ["Herkese açık GitHub reposu (yarışma başladıktan sonra açılmış)", "Canlı demo linki (https)", "Şartnamedeki API uçları ve data-testid adları"],
          positions: TEAM_FIELDS[v.difficulty].map((field) => ({ field, perTeam: 1 })),
          difficulty: v.difficulty,
          spec_id: bank?.id ?? null,
          spec,
          tests: bank?.publicTests ?? [],
          publish_on: v.publishOn,
          apply_deadline: v.applyDeadline,
          start_date: v.start,
          end_date: v.end,
        }),
      "yarışma",
    );
    return id;
  });
}

export async function deleteDraft(id: string) {
  return run(async () => {
    await requireAdmin();
    const c = await getComp(CompId.parse(id));
    if (!c || c.status !== "Taslak") throw new UserError("Sadece taslak silinebilir.");
    check(await db().from("competitions").delete().eq("id", c.id), "silme");
    return true;
  });
}

const DraftInput = z.object({ title: z.string().trim().min(3).max(60), difficulty: DIFF, idea: text(1000) });

export async function draftSpecAction(input: z.input<typeof DraftInput>) {
  return run(async () => {
    await requireAdmin();
    const v = DraftInput.parse(input);
    try {
      const spec = await draftSpec(v.title, v.difficulty, v.idea);
      if (!spec) throw new UserError("Taslak oluşturulamadı. Tekrar dene.");
      return spec;
    } catch (e) {
      if (e instanceof QuotaError) throw new UserError("Gemini günlük kotası doldu.");
      throw e;
    }
  });
}

/** Gemini şartnameden test kodu üretir; yönetici bakıp "Özel repoya yaz" der. Kaydedilmez. */
export async function generateTestsAction(id: string) {
  return run(async () => {
    await requireAdmin();
    const r = await db().from("competitions").select("spec, difficulty, locked").eq("id", CompId.parse(id)).maybeSingle();
    const c = r.data as { spec: CompetitionSpec; difficulty: "Kolay" | "Orta" | "Zor"; locked: boolean } | null;
    if (!c) throw new UserError("Yarışma bulunamadı.");
    if (c.locked) throw new UserError("Yayına alınan yarışmanın testleri değişmez.");
    try {
      const tests = await generateTests(c.spec, c.difficulty);
      if (!tests) throw new UserError("Testler üretilemedi. Tekrar dene.");
      return tests;
    } catch (e) {
      if (e instanceof QuotaError) throw new UserError("Gemini günlük kotası doldu.");
      throw e;
    }
  });
}

const PushInput = z.object({ id: CompId, acik: z.string().min(50).max(60_000), gizli: z.string().min(50).max(120_000) });

export async function pushTestsAction(input: z.input<typeof PushInput>) {
  return run(async () => {
    await requireAdmin();
    const v = PushInput.parse(input);
    const c = (await db().from("competitions").select("id, code, spec_id, locked").eq("id", v.id).maybeSingle()).data as { id: string; code: string; spec_id: string | null; locked: boolean } | null;
    if (!c) throw new UserError("Yarışma bulunamadı.");
    if (c.locked) throw new UserError("Yayına alınan yarışmanın testleri değişmez.");
    const specId = c.spec_id ?? `ozel-${c.id}`;
    try {
      await pushTestFile(`sartnameler/${specId}/acik.spec.ts`, v.acik, `${c.code} açık testler`);
      await pushTestFile(`sartnameler/${specId}/gizli.spec.ts`, v.gizli, `${c.code} gizli testler`);
    } catch (e) {
      if (e instanceof EvalError) throw new UserError(e.message);
      throw e;
    }
    const titles = [...v.acik.matchAll(/test\(\s*["'`](A\d+[^"'`]*)["'`]/g)].map((m, i) => ({ id: `A${i + 1}`, title: m[1].slice(0, 200), public: true }));
    const hidden = [...v.gizli.matchAll(/test\(\s*["'`](G\d+[^"'`]*)["'`]/g)].length;
    const spec = ((await db().from("competitions").select("spec").eq("id", c.id).single()).data as { spec: Record<string, unknown> }).spec;
    check(await db().from("competitions").update({ spec_id: specId, tests: titles, spec: { ...spec, hiddenCount: hidden, validation: undefined }, tests_verified_at: null }).eq("id", c.id), "testler");
    return true;
  });
}

const ValidateInput = z.object({ id: CompId, sampleUrl: z.union([z.string().url().startsWith("https://"), z.literal("")]).optional() });

/** Testleri örnek çözüme (bankadakiler için repodaki örnek, yeni şartname için verilen adres) ve boş projeye karşı çalıştırır. */
export async function validateTestsAction(input: z.input<typeof ValidateInput>) {
  return run(async () => {
    await requireAdmin();
    const v = ValidateInput.parse(input);
    const c = await getComp(v.id);
    if (!c?.spec_id) throw new UserError("Önce testleri özel repoya yaz.");
    if (!bankSpec(c.spec_id) && !v.sampleUrl) throw new UserError("Yeni şartname için örnek çözümün demo adresini gir.");
    try {
      await dispatchRun("dogrulama", c.id, { spec_id: c.spec_id, sample_url: v.sampleUrl || null });
    } catch (e) {
      if (e instanceof EvalError) throw new UserError(e.message);
      throw e;
    }
    return true;
  });
}

/** Sıraya koy: şartname ve testler kilitlenir; cron yayın günü gelince açar. */
export async function queueCompetition(id: string) {
  return run(async () => {
    await requireAdmin();
    const r = await db().from("competitions").select("id, status, spec_id, tests_verified_at, publish_on").eq("id", CompId.parse(id)).maybeSingle();
    const c = r.data as { id: string; status: string; spec_id: string | null; tests_verified_at: string | null; publish_on: string | null } | null;
    if (!c || c.status !== "Taslak") throw new UserError("Sadece taslak sıraya konur.");
    const bank = bankSpec(c.spec_id);
    if (!(bank?.verified || c.tests_verified_at)) throw new UserError("Testler örnek çözüme karşı doğrulanmadan yarışma sıraya konamaz.");
    if (!c.publish_on) throw new UserError("Yayın tarihi yok.");
    check(await db().from("competitions").update({ status: "Sırada", locked: true }).eq("id", c.id), "sıraya koyma");
    return true;
  });
}

export async function publishNow(id: string) {
  return run(async () => {
    await requireAdmin();
    const c = await getComp(CompId.parse(id));
    if (!c || c.status !== "Sırada") throw new UserError("Sadece sıradaki yarışma hemen açılabilir.");
    check(await db().from("competitions").update({ status: "Başvurular açık", publish_on: todayTR() }).eq("id", c.id), "açma");
    return true;
  });
}

const CancelInput = z.object({ id: CompId, reason: z.string().trim().min(5, "İptal sebebini yaz.").max(300) });

/** İptal: testlerde hata çıkarsa; kimse puan almaz. */
export async function cancelCompetition(input: z.input<typeof CancelInput>) {
  return run(async () => {
    await requireAdmin();
    const v = CancelInput.parse(input);
    const c = await getComp(v.id);
    if (!c || ["Tamamlandı", "İptal"].includes(c.status)) throw new UserError("Bu yarışma iptal edilemez.");
    check(await db().from("competitions").update({ status: "İptal", cancel_reason: v.reason }).eq("id", c.id), "iptal");
    const people = new Set([
      ...(((await db().from("applications").select("user_id").eq("competition_id", c.id)).data ?? []) as { user_id: string }[]).map((x) => x.user_id),
      ...(((await db().from("team_members").select("user_id").eq("competition_id", c.id)).data ?? []) as { user_id: string }[]).map((x) => x.user_id),
    ]);
    for (const u of people) await notify(u, `${c.code} ${c.title} iptal edildi: ${v.reason}`, `/yarismalar/${c.id}`);
    return true;
  });
}

const flowError = (e: unknown) => {
  if (e instanceof EvalError) throw new UserError(e.message);
  throw e;
};

/** Elle tetiklemeler (demo için): takımları şimdi kur, şimdi değerlendir. */
export async function formTeamsNow(id: string) {
  return run(async () => {
    await requireAdmin();
    return formTeams(CompId.parse(id)).catch(flowError);
  });
}

export async function evaluateNow(id: string) {
  return run(async () => {
    await requireAdmin();
    return freezeAndEvaluate(CompId.parse(id)).catch(flowError);
  });
}

export async function runDailyNow() {
  return run(async () => {
    await requireAdmin();
    return runDaily();
  });
}

export async function closeSeasonNow(confirm: string) {
  return run(async () => {
    await requireAdmin();
    if (confirm !== "SEZONU BİTİR") throw new UserError("Onay için SEZONU BİTİR yaz.");
    const s = await openSeason();
    if (!s) throw new UserError("Açık sezon yok.");
    return closeSeason(s.id);
  });
}

export async function closeReport(id: string) {
  return run(async () => {
    await requireAdmin();
    check(await db().from("reports").update({ status: "Kapatıldı" }).eq("id", z.string().uuid().parse(id)), "şikayet");
    return true;
  });
}

const SuspendInput = z.object({ username: z.string().regex(/^[a-z0-9_-]{3,30}$/), on: z.boolean() });

/** Askıya alınan kullanıcı işlem yapamaz, ligde ve herkese açık profilde görünmez. Yönetici kendini askıya alamaz. */
export async function setSuspended(input: z.input<typeof SuspendInput>) {
  return run(async () => {
    const admin = await requireAdmin();
    const v = SuspendInput.parse(input);
    const p = (await db().from("profiles").select("id, is_admin").eq("username", v.username).maybeSingle()).data as { id: string; is_admin: boolean } | null;
    if (!p) throw new UserError("Kullanıcı bulunamadı.");
    if (p.id === admin.id || p.is_admin) throw new UserError("Yönetici askıya alınamaz.");
    check(await db().from("profiles").update({ suspended: v.on }).eq("id", p.id), "askıya alma");
    if (v.on) await db().from("reports").update({ status: "Kapatıldı" }).eq("target_user", p.id).eq("status", "Açık");
    return true;
  });
}
