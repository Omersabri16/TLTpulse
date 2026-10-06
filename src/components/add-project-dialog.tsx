"use client";

import { Check as CheckIcon, CircleCheck, CircleDashed, Clock, FileCode2, GitBranch, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addProject, previewProject, type PreviewResult } from "@/app/actions/projects";
import { GithubVerify } from "@/components/github-verify";
import { Field, Modal } from "@/components/modal";
import { Pill } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { celebrateIfAboveLine } from "@/lib/celebrate";
import { DIFFICULTY_POINTS, importPenalized, MIN_COMMIT_DAYS, parseRepoUrl, QUALITY_RULES } from "@/lib/score";
import { isHttpUrl } from "@/lib/safe";
import { useAct, useApp, useMyScore } from "@/lib/store";
import type { ProjectAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES = ["Repo ve commit yazarlığı", "Dosya özetleri: kopya ve şablon kontrolü", "AI kodu okuyup zorluğu sınıflandırıyor", "CI, demo, README ve commit günleri"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const REJECT_TITLE: Record<string, string> = { kopya: "Kopya kod", şablon: "Çoğu şablon dosyası", fork: "Fork", yazarlık: "Commit yazarlığı yetersiz", erişim: "Repoya ulaşılamadı" };

/** Analiz sonucunun ortak gösterimi (ekleme penceresi ve proje detayı). */
export function AnalysisView({ analysis, repo, sha, pending = false }: { analysis: ProjectAnalysis; repo: string; sha?: string; pending?: boolean }) {
  const a = analysis;
  const fileUrl = (f: string) => `https://github.com/${repo}/blob/${sha ?? "HEAD"}/${f.split("/").map(encodeURIComponent).join("/")}`;
  const checks = [
    ["Testler CI'da yeşil", a.checks.tests, QUALITY_RULES.ci],
    ["Demo linki açılıyor", a.checks.demo, QUALITY_RULES.demo],
    ["Anlamlı README", a.checks.readme, QUALITY_RULES.readme],
    [`${MIN_COMMIT_DAYS}+ farklı günde commit (${a.commitDays} gün)`, a.checks.days, QUALITY_RULES.days],
  ] as const;
  const imported = !pending && importPenalized(a.difficulty, a.importedRatio);
  return (
    <div className="grid gap-5">
      {imported && (
        <div className="flex gap-3 rounded-2xl bg-warn-bg p-4 text-sm text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <b className="block">Kodun %{Math.round(a.importedRatio * 100)}&apos;i ilk commit&apos;le gelmiş ve sonra değişmemiş.</b>
            Kural gereği puan, sonradan yazılan kısmın oranıyla çarpılır (şu an × {(1 - a.importedRatio).toFixed(2)}). Projeyi küçük commit&apos;lerle geliştirmeye devam edip
            &quot;Yeniden analiz et&quot; dersen puan artar.
          </p>
        </div>
      )}
      {a.reasons.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">AI neden {a.difficulty.toLowerCase()} dedi?</h3>
          <ul className="grid gap-2">
            {a.reasons.map((r) => (
              <li key={r.file + r.feature} className="flex items-start gap-2 text-sm">
                <FileCode2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {r.feature}:{" "}
                  <a href={fileUrl(r.file)} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:underline">
                    {r.file}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Kalite {pending ? "(Orta ve Zor projede puana eklenir, en fazla 30)" : a.difficulty === "Kolay" ? "(Kolay projede puana eklenmez)" : `(+${a.qualityPoints} / 30)`}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checks.map(([k, v, pts]) => (
            <li key={k} className={cn("flex items-center gap-2 text-sm", !v && "text-muted-foreground")}>
              {v ? <CircleCheck className="size-4 text-ok" /> : <CircleDashed className="size-4" />} {k} <span className="text-xs text-muted-foreground">+{pts}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          ["Yazarlık", `%${a.authorship}`],
          ["Kendi dosyası", a.ownFiles],
          ["Commit", a.commits],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-2xl bg-muted p-3">
            <span className="block text-xs text-muted-foreground">{k}</span>
            <b className="text-base">{v}</b>
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
    </div>
  );
}

/** Pencere her açılışta temiz durumla başlasın diye içerik sadece açıkken bağlanır. */
export function AddProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <AddProjectBody onOpenChange={onOpenChange} /> : null;
}

function AddProjectBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const profile = useApp((s) => s.profile);
  const projects = useApp((s) => s.projects);
  const score = useMyScore();
  const act = useAct();
  const [busy, setBusy] = useState(false);

  const [phase, setPhase] = useState<"form" | "analyzing" | "result">("form");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [err, setErr] = useState("");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<PreviewResult | null>(null);

  // Analiz sürerken adımlar sırayla ilerler; sonuç gelince kalan adımlar tamamlanır.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const timers = STAGES.slice(0, -1).map((_, i) => setTimeout(() => setStage((s) => Math.max(s, i + 1)), 1500 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const onUrl = (v: string) => {
    setUrl(v);
    const p = parseRepoUrl(v);
    if (p && !name) setName(p.repo);
  };

  const input = () => ({ repoUrl: url, name, description, demoUrl: demoUrl.trim() });

  const submit = async () => {
    const parsed = parseRepoUrl(url);
    if (!parsed) return setErr("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
    if (projects.some((p) => p.repoUrl.toLowerCase().replace(/\/$/, "") === `https://github.com/${parsed.owner}/${parsed.repo}`.toLowerCase()))
      return setErr("Bu proje zaten ekli.");
    if (!name.trim()) return setErr("Proje adını yaz.");
    if (description.trim().length < 15) return setErr("Projeyi bir cümleyle anlat (en az 15 karakter).");
    if (demoUrl.trim() && !isHttpUrl(demoUrl)) return setErr("Demo linki https:// ile başlamalı.");
    setErr("");
    setStage(0);
    setPhase("analyzing");
    const [res] = await Promise.all([act(previewProject(input()), { silent: true }), wait(1500)]);
    setStage(STAGES.length);
    await wait(300);
    if (res === null) {
      setPhase("form");
      return setErr("Analiz yapılamadı. Linki kontrol edip tekrar dene.");
    }
    setResult(res);
    setPhase("result");
  };

  const confirm = async () => {
    if (!result?.ok) return;
    setBusy(true);
    const res = await act(addProject(input()));
    setBusy(false);
    if (!res) return;
    if (res.pending) toast(`${name} eklendi`, { description: "Zorluk analizi bitince puanı yazılacak; bildirim gelecek." });
    else if (!celebrateIfAboveLine(score, res.me.score)) toast.success(`${name} eklendi`, { description: `+${res.points} puan bu sezona` });
    onOpenChange(false);
  };

  if (!profile?.github || !profile.githubVerified)
    return (
      <Modal open onOpenChange={onOpenChange} title="Proje ekle" description="Projelerin GitHub'daki commit'lerinle eşleştirilir. Önce GitHub hesabının sana ait olduğunu doğrula." className="sm:max-w-xl">
        {profile?.github ? (
          <GithubVerify />
        ) : (
          <p className="text-sm text-muted-foreground">Profiline GitHub kullanıcı adını ekle (Profili düzenle), sonra burada doğrula.</p>
        )}
      </Modal>
    );

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={phase === "result" ? "Analiz sonucu" : "Proje ekle"}
      description={phase === "form" ? "GitHub linkini yapıştır, projeni bir cümleyle anlat. Teknolojiler, testler ve zorluk repodan okunur." : undefined}
      className="sm:max-w-xl"
    >
      {phase === "form" && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="GitHub linki" hint={`Commit'lerin github.com/${profile.github} hesabıyla eşleştirilir. Sadece herkese açık repolar.`}>
            <div className="relative">
              <GitBranch className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className={cn(inputClass, "pl-10")} value={url} onChange={(e) => onUrl(e.target.value)} placeholder="https://github.com/kullanici/repo" autoFocus />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Proje adı">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="pulse-api" />
            </Field>
            <Field label="Canlı demo (isteğe bağlı)" hint="Açılıyorsa kaliteye +8.">
              <input className={inputClass} value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <Field label="Ne yapıyor?">
            <textarea className={cn(inputClass, "h-auto min-h-20 py-3")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Gerçek zamanlı bildirim ve kullanıcı yönetimi API'si." />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button className={btn("primary")}>Analiz et</button>
          </div>
        </form>
      )}

      {phase === "analyzing" && (
        <ul className="grid gap-3 py-4" aria-live="polite">
          {STAGES.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 text-sm transition", i <= stage ? "opacity-100" : "opacity-30")}>
              {i < stage ? <CheckIcon className="size-4 text-ok" /> : i === stage ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4" />}
              {s}
            </li>
          ))}
        </ul>
      )}

      {phase === "result" && result && !result.ok && (
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              <b className="block">{REJECT_TITLE[result.kind] ?? "Eklenemez"}</b>
              {result.reason}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPhase("form")} className={btn("primary")}>
              Başka bir repo dene
            </button>
          </div>
        </div>
      )}

      {phase === "result" && result?.ok && (
        <div className="grid gap-5">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-navy p-5 text-on-navy">
            <div>
              <p className="text-xs text-on-navy-muted">{name}</p>
              {result.pending ? (
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-cyan">
                  <Clock className="size-5" /> Analiz bekliyor
                </p>
              ) : (
                <>
                  <p className="mt-1 text-4xl font-semibold text-cyan">+{result.analysis.points}</p>
                  <p className="text-xs text-on-navy-muted">puan / 100</p>
                </>
              )}
            </div>
            {!result.pending && (
              <div className="grid gap-1 text-right text-sm">
                <span>
                  Zorluk: <b>{result.analysis.difficulty}</b> <span className="text-on-navy-muted">+{DIFFICULTY_POINTS[result.analysis.difficulty]}</span>
                </span>
                <span>
                  Kalite: <b>{result.analysis.quality}</b>
                </span>
              </div>
            )}
          </div>
          {result.pending && (
            <p className="text-sm text-muted-foreground">AI zorluk sınıflandırması şu an yapılamadı. Projeyi ekleyebilirsin; analiz bitince puanı yazılır ve bildirim gelir.</p>
          )}
          <AnalysisView analysis={result.analysis} repo={result.repo} sha={result.analysis.commitSha} pending={result.pending} />
          <div className="flex flex-wrap gap-1.5">
            {result.techs.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
            <Pill tone="muted">{result.role}</Pill>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPhase("form")} className={btn("ghost")}>
              Düzenle
            </button>
            <button onClick={confirm} disabled={busy} className={btn("primary")}>
              {busy ? "Ekleniyor…" : "Projeyi ekle"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
