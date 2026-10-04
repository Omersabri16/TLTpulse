"use client";

import { Check as CheckIcon, GitBranch, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addProject, previewProject } from "@/app/actions/projects";
import { GithubVerify } from "@/components/github-verify";
import { Choice, Field, Modal } from "@/components/modal";
import { Pill } from "@/components/page-shell";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { celebrateIfLevelUp } from "@/lib/celebrate";
import { parseRepoUrl } from "@/lib/score";
import { isHttpUrl } from "@/lib/safe";
import { useAct, useApp, useMyScore } from "@/lib/store";
import type { ProjectAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES = ["Repo bulundu", "Commit yazarlığı kontrol ediliyor", "Dosya yapısı okunuyor: test, CI, README", "Zorluk ve kalite hesaplanıyor"];
type Result = { ok: true; analysis: ProjectAnalysis } | { ok: false; reason: string };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const [techs, setTechs] = useState<string[]>([]);
  const [role, setRole] = useState<"Tek başıma" | "Takımla">("Tek başıma");
  const [demoUrl, setDemoUrl] = useState("");
  const [err, setErr] = useState("");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  // Analiz sürerken adımlar sırayla ilerler; sonuç gelince kalan adımlar tamamlanır.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const timers = STAGES.slice(0, -1).map((_, i) => setTimeout(() => setStage((s) => Math.max(s, i + 1)), 700 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const onUrl = (v: string) => {
    setUrl(v);
    const p = parseRepoUrl(v);
    if (p && !name) setName(p.repo);
  };

  const input = () => ({ repoUrl: url, name, description, techs, role, demoUrl: demoUrl.trim() });

  const submit = async () => {
    const parsed = parseRepoUrl(url);
    if (!parsed) return setErr("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
    if (projects.some((p) => p.repoUrl.toLowerCase().replace(/\/$/, "") === `https://github.com/${parsed.owner}/${parsed.repo}`.toLowerCase()))
      return setErr("Bu proje zaten ekli.");
    if (!name.trim()) return setErr("Proje adını yaz.");
    if (description.trim().length < 15) return setErr("Projeyi bir cümleyle anlat (en az 15 karakter).");
    if (!techs.length) return setErr("En az bir teknoloji ekle.");
    if (demoUrl.trim() && !isHttpUrl(demoUrl)) return setErr("Demo linki https:// ile başlamalı.");
    setErr("");
    setStage(0);
    setPhase("analyzing");
    const [res] = await Promise.all([act(previewProject(input()), { silent: true }).then((r) => r), wait(1400)]);
    setStage(STAGES.length);
    await wait(300);
    if (res === null) {
      setPhase("form");
      return setErr("Analiz yapılamadı. Linki kontrol edip tekrar dene.");
    }
    setResult(res.ok ? { ok: true, analysis: res.analysis } : { ok: false, reason: res.reason });
    setPhase("result");
  };

  const confirm = async () => {
    if (!result?.ok) return;
    setBusy(true);
    const before = score.total;
    const res = await act(addProject(input()));
    setBusy(false);
    if (!res) return;
    if (!celebrateIfLevelUp(before, res.me.score.total)) toast.success(`${name} eklendi`, { description: `+${res.points} puan` });
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
          <p className="text-xs text-muted-foreground">README, testler, CI ve commit geçmişi GitHub&apos;dan otomatik okunur.</p>
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
            <button onClick={confirm} disabled={busy} className={btn("primary")}>
              {busy ? "Ekleniyor…" : "Projeyi ekle"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
