"use client";

import { Check as CheckIcon, GitBranch, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Choice, Field, Modal } from "@/components/modal";
import { Pill } from "@/components/page-shell";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { celebrateIfLevelUp } from "@/lib/celebrate";
import { analyzeProject, parseRepoUrl, type AnalyzeResult } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { ProjectAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES = ["Repo bulundu", "Commit yazarlığı kontrol ediliyor", "Dosya yapısı okunuyor: test, CI, README", "Zorluk ve kalite hesaplanıyor"];
const NO_CHECKS: ProjectAnalysis["checks"] = { readme: true, tests: false, ci: false, demo: false };

/** Pencere her açılışta temiz durumla başlasın diye içerik sadece açıkken bağlanır. */
export function AddProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <AddProjectBody onOpenChange={onOpenChange} /> : null;
}

function AddProjectBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const profile = useApp((s) => s.profile);
  const projects = useApp((s) => s.projects);
  const addProject = useApp((s) => s.addProject);
  const score = useMyScore();

  const [phase, setPhase] = useState<"form" | "analyzing" | "result">("form");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techs, setTechs] = useState<string[]>([]);
  const [role, setRole] = useState<"Tek başıma" | "Takımla">("Tek başıma");
  const [demoUrl, setDemoUrl] = useState("");
  const [checks, setChecks] = useState(NO_CHECKS);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const timers = STAGES.map((_, i) => setTimeout(() => setStage(i + 1), 450 * (i + 1)));
    const done = setTimeout(() => setPhase("result"), 450 * STAGES.length + 300);
    return () => [...timers, done].forEach(clearTimeout);
  }, [phase]);

  const onUrl = (v: string) => {
    setUrl(v);
    const p = parseRepoUrl(v);
    if (p && !name) setName(p.repo);
  };

  const submit = () => {
    const parsed = parseRepoUrl(url);
    if (!parsed) return setErr("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
    if (projects.some((p) => p.repoUrl.toLowerCase().replace(/\/$/, "") === `https://github.com/${parsed.owner}/${parsed.repo}`.toLowerCase()))
      return setErr("Bu proje zaten ekli.");
    if (!name.trim()) return setErr("Proje adını yaz.");
    if (description.trim().length < 15) return setErr("Projeyi bir cümleyle anlat (en az 15 karakter).");
    if (!techs.length) return setErr("En az bir teknoloji ekle.");
    setErr("");
    setStage(0);
    setResult(analyzeProject({ repoUrl: url, techs, role, checks: { ...checks, demo: !!demoUrl.trim() }, githubUser: profile?.github ?? "" }));
    setPhase("analyzing");
  };

  const confirm = () => {
    if (!result?.ok || !profile) return;
    const parsed = parseRepoUrl(url)!;
    const gain = result.analysis.points;
    addProject({
      id: `p-${Date.now()}`,
      name: name.trim(),
      repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      description: description.trim(),
      techs,
      role,
      language: techs[0],
      demoUrl: demoUrl.trim() || undefined,
      addedAt: new Date().toISOString(),
      analysis: result.analysis,
    });
    if (!celebrateIfLevelUp(score.total, score.total + gain)) toast.success(`${name} eklendi`, { description: `+${gain} puan` });
    onOpenChange(false);
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={phase === "result" ? "Analiz sonucu" : "Proje ekle"}
      description={phase === "form" ? "GitHub linkini yapıştır ve projeni kısaca anlat. Zorluk ve kalite otomatik hesaplanır." : undefined}
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
          <Field label="GitHub linki" hint={profile?.github ? `Commit'lerin github.com/${profile.github} hesabıyla eşleştirilir.` : "Profiline GitHub kullanıcı adını eklersen yazarlık daha doğru ölçülür."}>
            <div className="relative">
              <GitBranch className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className={cn(inputClass, "pl-10")} value={url} onChange={(e) => onUrl(e.target.value)} placeholder="https://github.com/kullanici/repo" autoFocus />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Proje adı">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="pulse-api" />
            </Field>
            <Field label="Canlı demo (isteğe bağlı)">
              <input className={inputClass} value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <Field label="Ne yapıyor?">
            <textarea className={cn(inputClass, "h-auto min-h-20 py-3")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Gerçek zamanlı bildirim ve kullanıcı yönetimi API'si." />
          </Field>
          <Field label="Teknolojiler">
            <TagInput value={techs} onChange={setTechs} placeholder="React, Node.js…" suggestions={["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Python", "Go", "Flutter"]} />
          </Field>
          <Field label="Nasıl yaptın?">
            <Choice value={role} onChange={setRole} options={["Tek başıma", "Takımla"]} />
          </Field>
          <Field label="Projede neler var?" hint="GitHub'dan da kontrol edilir; yanlış işaretlenen puan getirmez.">
            <div className="flex flex-wrap gap-2">
              <Check label="README" checked={checks.readme} onChange={(v) => setChecks({ ...checks, readme: v })} />
              <Check label="Testler" checked={checks.tests} onChange={(v) => setChecks({ ...checks, tests: v })} />
              <Check label="CI (GitHub Actions)" checked={checks.ci} onChange={(v) => setChecks({ ...checks, ci: v })} />
            </div>
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
            <p>{result.reason}</p>
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
              <p className="mt-1 text-4xl font-semibold text-cyan">+{result.analysis.points}</p>
              <p className="text-xs text-on-navy-muted">puan</p>
            </div>
            <div className="grid gap-2 text-right text-sm">
              <span>
                Zorluk: <b>{result.analysis.difficulty}</b>
              </span>
              <span>
                Kalite: <b>{result.analysis.quality}</b>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Yazarlık", `%${result.analysis.authorship}`],
              ["Commit", result.analysis.commits],
              ["Test", result.analysis.checks.tests ? "Var" : "Yok"],
              ["CI", result.analysis.checks.ci ? "Var" : "Yok"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl bg-muted p-3">
                <span className="block text-xs text-muted-foreground">{k}</span>
                <b className="text-base">{v}</b>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.analysis.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPhase("form")} className={btn("ghost")}>
              Düzenle
            </button>
            <button onClick={confirm} className={btn("primary")}>
              Projeyi ekle
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
