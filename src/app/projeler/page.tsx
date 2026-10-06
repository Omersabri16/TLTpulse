"use client";

import { Check, Clock, ExternalLink, GitBranch, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { reanalyzeProject, removeProject, retryMyProject } from "@/app/actions/projects";
import { AddProjectDialog, AnalysisView } from "@/components/add-project-dialog";
import { Modal } from "@/components/modal";
import { Container, PageHero, PageShell, Pill, Segmented } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import { safeHref } from "@/lib/safe";
import { DIFFICULTY_POINTS, levelLabel } from "@/lib/score";
import { useAct, useApp, useMyScore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

function ProjectDetail({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const act = useAct();
  const [busy, setBusy] = useState<"" | "yeniden" | "sil">("");
  if (!project) return null;
  const a = project.analysis;
  const repo = project.repoUrl.replace("https://github.com/", "");
  const pending = project.status === "analiz bekliyor";

  const reanalyze = async () => {
    setBusy("yeniden");
    const res = pending ? await act(retryMyProject(project.id)) : await act(reanalyzeProject(project.id));
    setBusy("");
    if (!res) return;
    if ("after" in res) {
      const d = res.after - res.before;
      toast.success("Yeniden analiz edildi", { description: d === 0 ? "Puan değişmedi." : `${d > 0 ? "+" : ""}${d} puan bu sezona yazıldı.` });
    } else toast.success("Analiz tamamlandı");
    onClose();
  };

  return (
    <Modal open={!!project} onOpenChange={(o) => !o && onClose()} title={project.name} description={project.description} className="sm:max-w-xl">
      <div className="grid gap-5">
        {pending ? (
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm">
            <Clock className="size-5 shrink-0 text-primary" />
            <span>Zorluk analizi bekliyor. Günlük iş her gün tekrar dener; istersen şimdi de deneyebilirsin.</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-navy p-4 text-on-navy">
              <span className="block text-xs text-on-navy-muted">Puan</span>
              <b className="text-3xl text-cyan">+{a.points}</b>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <span className="block text-xs text-muted-foreground">Zorluk (AI)</span>
              <b className="text-lg">{a.difficulty}</b>
              <span className="block text-xs text-muted-foreground">+{DIFFICULTY_POINTS[a.difficulty]}</span>
            </div>
            <div className="rounded-2xl bg-muted p-4">
              <span className="block text-xs text-muted-foreground">Kalite</span>
              <b className="text-lg">{a.quality}</b>
              <span className="block text-xs text-muted-foreground">{a.difficulty === "Kolay" ? "sayılmaz" : `+${a.qualityPoints}`}</span>
            </div>
          </div>
        )}
        <AnalysisView analysis={a} repo={repo} sha={a.commitSha} pending={pending} />
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Nasıl yapıldı</dt>
          <dd className="text-right font-semibold">{project.role}</dd>
          <dt className="text-muted-foreground">Eklendi</dt>
          <dd className="text-right font-semibold">{fmtDate(project.addedAt)}</dd>
          {a.commitSha && (
            <>
              <dt className="text-muted-foreground">Analiz edilen commit</dt>
              <dd className="text-right font-mono text-xs">{a.commitSha.slice(0, 7)}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {project.techs.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy("sil");
                const ok = await act(removeProject(project.id));
                setBusy("");
                if (!ok) return;
                toast(`${project.name} kaldırıldı`, { description: "Puanı geri alındı." });
                onClose();
              }}
              disabled={!!busy}
              className={btn("ghost", "md", "text-destructive")}
            >
              <Trash2 /> Kaldır
            </button>
            <button onClick={reanalyze} disabled={!!busy} className={btn("outline")} title="Repoya yeni commit geldiyse puanı günceller">
              <RefreshCw className={cn(busy === "yeniden" && "animate-spin")} /> {pending ? "Şimdi dene" : "Yeniden analiz et"}
            </button>
          </div>
          <div className="flex gap-2">
            {safeHref(project.demoUrl) && (
              <a href={safeHref(project.demoUrl)} target="_blank" rel="noreferrer" className={btn("outline")}>
                Demo <ExternalLink />
              </a>
            )}
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className={btn("primary")}>
              <GitBranch /> GitHub
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Projects() {
  const projects = useApp((s) => s.projects);
  const score = useMyScore();
  const params = useSearchParams();
  const router = useRouter();
  // ?ekle=1 ile gelinirse (yol haritası kısayolu) pencere açık başlar.
  const [adding, setAdding] = useState(() => !!params.get("ekle"));
  const [detail, setDetail] = useState<Project | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"yeni" | "puan">("yeni");

  useEffect(() => {
    if (params.get("ekle")) router.replace("/projeler", { scroll: false });
  }, [params, router]);

  const list = useMemo(() => {
    const t = q.toLocaleLowerCase("tr");
    const f = projects.filter((p) => !t || p.name.toLowerCase().includes(t) || p.techs.some((x) => x.toLowerCase().includes(t)));
    return sort === "puan" ? [...f].sort((a, b) => b.analysis.points - a.analysis.points) : f;
  }, [projects, q, sort]);

  const projPart = score.parts.find((p) => p.source === "Projeler") ?? { points: 0 };
  const projAll = score.allParts.find((p) => p.source === "Projeler") ?? { points: 0 };

  return (
    <>
      <PageHero
        eyebrow="Kodun, senin kanıtın"
        title="Her proje,"
        highlight="bir adım."
        right={
          <div className="text-left sm:text-right">
            <p className="text-6xl leading-none font-semibold text-cyan tabular-nums">{score.season}</p>
            <span className="mt-1 block text-xs text-on-navy-muted">sezon puanı</span>
            <span className="mt-3 inline-block rounded-full bg-lav px-3 py-1 text-xs font-semibold text-secondary-foreground">{levelLabel(score.level)}</span>
            <Link href="/lig" className="mt-3 block text-xs text-cyan hover:underline">
              Lig sıram: {score.rank.rank}. ↗
            </Link>
          </div>
        }
      />
      <Container>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: "yeni", label: "En yeni" },
              { value: "puan", label: "En çok puan" },
            ]}
          />
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className={cn(inputClass, "rounded-full pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Proje ya da teknoloji ara" />
            </div>
            <button onClick={() => setAdding(true)} className={btn("primary", "md", "h-11")}>
              <Plus /> Proje ekle
            </button>
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          Projelerden bu sezon <b className="text-foreground">{projPart.points}</b> puan · tüm zamanlar <b className="text-foreground">{projAll.points}</b>
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className="flex flex-col rounded-3xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-muted">
                  <GitBranch className="size-5" />
                </span>
                {p.status === "analiz bekliyor" ? (
                  <Pill tone="muted">
                    <Clock className="size-3" /> Analiz bekliyor
                  </Pill>
                ) : (
                  <Pill tone="ok">
                    <Check className="size-3" /> Kodla kanıtlı
                  </Pill>
                )}
              </div>
              <h2 className="mt-5 text-xl font-semibold">{p.name}</h2>
              <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.techs.map((t) => (
                  <Pill key={t} className="font-normal">
                    {t}
                  </Pill>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-muted-foreground">
                  {p.status === "analiz bekliyor" ? (
                    "Puan analizden sonra"
                  ) : (
                    <>
                      {p.analysis.difficulty} · {p.analysis.quality} · <b className="text-primary">+{p.analysis.points}</b>
                    </>
                  )}
                </span>
                <button onClick={() => setDetail(p)} className="font-semibold text-primary hover:underline">
                  Detayları gör
                </button>
              </div>
            </article>
          ))}

          <button
            onClick={() => setAdding(true)}
            className="grid min-h-64 place-items-center rounded-3xl border border-dashed p-6 text-center transition hover:border-primary hover:bg-card"
          >
            <span>
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Plus className="size-5" />
              </span>
              <b className="mt-4 block text-lg font-semibold">Sıradaki projen ne?</b>
              <span className="mt-1 block text-sm text-muted-foreground">GitHub linkini yapıştır, gerisini biz hesaplayalım.</span>
            </span>
          </button>
        </div>

        {list.length === 0 && q && <p className="mt-6 text-sm text-muted-foreground">&quot;{q}&quot; ile eşleşen proje yok.</p>}
      </Container>
      <AddProjectDialog open={adding} onOpenChange={setAdding} />
      <ProjectDetail project={detail} onClose={() => setDetail(null)} />
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Suspense>
        <Projects />
      </Suspense>
    </PageShell>
  );
}
