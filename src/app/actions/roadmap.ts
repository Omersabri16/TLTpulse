"use server";

import { completeness, generateRoadmap, ROADMAP_MIN } from "@/lib/score";
import { check, FIELD, run, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { aiRoadmap } from "@/lib/server/gemini";
import { loadMe } from "@/lib/server/me";
import { allow } from "@/lib/server/rate";
import type { Field } from "@/lib/types";

/** Yol haritası: profil en az %75 doluysa Gemini oluşturur; olmazsa kural tabanlı. Puanlar kural tablosundan. */
export async function createRoadmap(target: Field) {
  return run(async () => {
    const user = await requireUser();
    const t = FIELD.parse(target);
    const me = await loadMe(user.id, user.email);
    if (!me.profile) throw new UserError("Profil bulunamadı.");
    if (completeness(me.profile, me.projects).percent < ROADMAP_MIN) throw new UserError(`Yol haritası için profilin en az %${ROADMAP_MIN} dolu olmalı.`);
    if (!(await allow(user.id, "roadmap", 5, 24))) throw new UserError("Bugün yeterince yol haritası oluşturdun. Yarın tekrar dene.");

    const open = await db().from("competitions").select("id, code, title, positions").eq("status", "Başvurular açık").order("apply_deadline");
    const openComp =
      ((open.data ?? []) as { id: string; code: string; title: string; positions: { field: string }[] }[]).find((c) => c.positions.some((p) => p.field === t)) ?? null;

    const ctx = { profile: me.profile, projects: me.projects, certs: me.certs, references: me.references, applications: me.applications, peerGivenCount: Object.keys(me.peerGiven).length };
    const rule = generateRoadmap(ctx, t, openComp);
    const ai = await aiRoadmap(ctx, t, openComp);

    check(
      await db()
        .from("roadmaps")
        .upsert(
          {
            user_id: user.id,
            target: t,
            summary: (ai?.summary ?? rule.summary).slice(0, 600),
            steps: ai?.steps ?? rule.steps,
            baseline: rule.baseline,
            source: ai ? "ai" : "kural",
            generated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        ),
      "yol haritası",
    );
    return { ai: !!ai, me: await loadMe(user.id, user.email) };
  });
}
