"use client";

import { Check, CircleCheck, Circle, Flag, Loader2, Lock, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Container, PageHero, PageShell, Pill } from "@/components/page-shell";
import { Progress } from "@/components/ui/progress";
import { btn, inputClass } from "@/lib/btn";
import { completeness, generateRoadmap, ROADMAP_MIN } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import { FIELDS, type Field } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES = ["Profilin okunuyor", "Projelerin ve kanıtların inceleniyor", "Hedef pozisyonla karşılaştırılıyor", "Adımlar hazırlanıyor"];

function Roadmap() {
  const profile = useApp((s) => s.profile)!;
  const projects = useApp((s) => s.projects);
  const certs = useApp((s) => s.certs);
  const references = useApp((s) => s.references);
  const applications = useApp((s) => s.applications);
  const peerGiven = useApp((s) => s.peerGiven);
  const roadmap = useApp((s) => s.roadmap);
  const setRoadmap = useApp((s) => s.setRoadmap);
  const score = useMyScore();

  const [target, setTarget] = useState<Field>((profile.field || roadmap?.target || "Backend") as Field);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);

  const comp = completeness(profile, projects);

  useEffect(() => {
    if (!loading) return;
    const timers = STAGES.map((_, i) => setTimeout(() => setStage(i + 1), 600 * (i + 1)));
    const done = setTimeout(() => {
      setRoadmap(generateRoadmap({ profile, projects, certs, references, applications, peerGivenCount: Object.keys(peerGiven).length }, target));
      setLoading(false);
    }, 600 * STAGES.length + 300);
    return () => [...timers, done].forEach(clearTimeout);
  }, [loading, profile, projects, certs, references, applications, peerGiven, target, setRoadmap]);

  const nextLevel = score.level === "Yeni başlayan" ? "Orta" : "Kıdemli";
  const goal = score.level === "Yeni başlayan" ? 60 : 80;
  const doneCount = roadmap ? roadmap.steps.filter((s) => score.roadmapDone.includes(s.id)).length : 0;
  const firstOpen = roadmap?.steps.find((s) => !score.roadmapDone.includes(s.id))?.id;
  const rmPart = score.parts.find((p) => p.source === "Yol haritası")!;

  const start = () => {
    setStage(0);
    setLoading(true);
  };

  return (
    <>
      <PageHero eyebrow="Kendi yolunu çiz" title="Sıradaki" highlight="adımın." subtitle="Küçük adımlar. Gerçek ilerleme." />
      <Container className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          {!comp.ready && (
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted">
                  <Lock className="size-5" />
                </span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">Önce profilini biraz doldur</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI, yol haritanı profiline bakarak çıkarır. Bunun için profilin en az %{ROADMAP_MIN} dolu olmalı.
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <Progress value={comp.percent} className="flex-1" />
                    <b className="text-sm">%{comp.percent}</b>
                  </div>
                </div>
              </div>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {comp.items.map((i) => (
                  <li key={i.label}>
                    <Link href={i.href} className={cn("flex items-center gap-2.5 rounded-2xl border p-3 text-sm transition", i.done ? "text-muted-foreground" : "hover:bg-muted")}>
                      {i.done ? <CircleCheck className="size-4 text-ok" /> : <Circle className="size-4" />}
                      <span className={cn(i.done && "line-through")}>{i.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {comp.ready && !roadmap && !loading && (
            <Card className="p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <Sparkles className="size-5" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold">Sana özel yol haritası</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Hedef pozisyonunu seç. AI projelerine, becerilerine ve kanıtlarına bakıp eksiklerini bulur, sıradaki adımlarını puanlarıyla çıkarır.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <select className={cn(inputClass, "rounded-full sm:w-52")} value={target} onChange={(e) => setTarget(e.target.value as Field)} aria-label="Hedef pozisyon">
                  {FIELDS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <button onClick={start} className={btn("primary", "md", "h-11")}>
                  <Sparkles /> Yol haritamı oluştur
                </button>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="p-6 sm:p-8">
              <h2 className="mb-5 text-lg font-semibold">Yol haritan hazırlanıyor…</h2>
              <ul className="grid gap-3" aria-live="polite">
                {STAGES.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-3 text-sm transition", i <= stage ? "opacity-100" : "opacity-30")}>
                    {i < stage ? <Check className="size-4 text-ok" /> : i === stage ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4" />}
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {roadmap && !loading && (
            <>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Hedef pozisyonun: {roadmap.target}</h2>
                <div className="flex gap-2">
                  <select className={cn(inputClass, "h-10 rounded-full sm:w-40")} value={target} onChange={(e) => setTarget(e.target.value as Field)} aria-label="Hedef pozisyon">
                    {FIELDS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <button onClick={start} className={btn("outline")}>
                    <RefreshCw /> Yeniden oluştur
                  </button>
                </div>
              </div>

              <div className="mb-8 flex gap-3 rounded-3xl border border-primary/30 bg-secondary p-5 text-sm text-secondary-foreground">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                <p>{roadmap.summary}</p>
              </div>

              <ol className="relative">
                {roadmap.steps.map((s, i) => {
                  const done = score.roadmapDone.includes(s.id);
                  const current = s.id === firstOpen;
                  return (
                    <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0 sm:gap-6">
                      {i < roadmap.steps.length - 1 && <span className="absolute top-12 bottom-0 left-6 w-px bg-border" />}
                      <span className={cn("z-10 grid size-12 shrink-0 place-items-center rounded-full border bg-card text-sm tabular-nums", done && "border-0 bg-ok-bg text-ok", current && "border-primary text-primary")}>
                        {done ? <Check className="size-5" /> : String(i + 1).padStart(2, "0")}
                      </span>
                      <div className={cn("flex-1 rounded-3xl border bg-card p-5 sm:p-6", current && "border-primary")}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[11px] tracking-wider text-muted-foreground uppercase">{done ? "Tamamlandı" : current ? "Sıradaki adım" : "Sonra"}</span>
                          <Pill tone={done ? "ok" : "lav"}>
                            {done && <Check className="size-3" />}+{s.points} puan
                          </Pill>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                        {!done && (
                          <Link href={s.action.href} className={btn(current ? "primary" : "outline", "sm", "mt-4")}>
                            {s.action.label} →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>

        <aside className="grid content-start gap-6">
          <div className="rounded-3xl bg-navy-2 p-7 text-on-navy">
            <Flag className="size-7 text-on-navy-muted" />
            <h2 className="mt-10 text-3xl leading-tight font-semibold">
              Hedefin:
              <br />
              {score.level === "Kıdemli" ? "Kıdemli ligde kal." : `${nextLevel} lig.`}
            </h2>
            {score.level !== "Kıdemli" && (
              <>
                <div className="mt-6 flex items-center gap-3">
                  <Progress value={(score.total / goal) * 100} className="flex-1" />
                  <span className="text-sm text-on-navy-muted tabular-nums">
                    {score.total}/{goal}
                  </span>
                </div>
                <p className="mt-3 text-sm text-on-navy-muted">{goal - score.total} puan kaldı.</p>
              </>
            )}
            <Link href="/lig" className="mt-6 inline-block text-sm font-semibold text-cyan hover:underline">
              Ligimi gör ↗
            </Link>
          </div>
          {roadmap && (
            <Card>
              <p className="text-sm text-muted-foreground">Yol haritasından gelen puan</p>
              <p className="mt-1 text-3xl font-semibold">
                {rmPart.points}
                <span className="text-base font-normal text-muted-foreground"> / {rmPart.max}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {doneCount} / {roadmap.steps.length} adım tamamlandı. Adımlar ilgili işi yaptığında kendiliğinden işaretlenir.
              </p>
            </Card>
          )}
        </aside>
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Roadmap />
    </PageShell>
  );
}
