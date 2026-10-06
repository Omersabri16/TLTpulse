"use client";

import { ArrowLeft, Check, CircleCheck, CircleX, ExternalLink, FlaskConical, GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/brand";
import { ChatThread } from "@/components/chat";
import { runPublicTests, sendTeamMessage, submitTeamRepo } from "@/app/actions/competitions";
import { Card, Container, PageHero, Pill } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { daysBetween, fmtDate } from "@/lib/competitions";
import { safeHref } from "@/lib/safe";
import { parseRepoUrl } from "@/lib/score";
import { useAct, useApp } from "@/lib/store";
import { dayEnded, fmtClock } from "@/lib/time";
import type { Competition, Team } from "@/lib/types";

const NO_CHAT: never[] = [];

export function TeamRoom({ data }: { data: { team: Team; competition: Competition } | null }) {
  const id = data?.team.id ?? "";
  const username = useApp((s) => s.session?.username ?? "");
  const chat = useApp((s) => s.teamChats[id] ?? NO_CHAT);
  const append = useApp((s) => s.appendTeamMessage);
  const act = useAct();
  const router = useRouter();
  const [repo, setRepo] = useState(data?.team.repoUrl ?? "");
  const [demo, setDemo] = useState(data?.team.demoUrl ?? "");
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const team = data?.team;
  const c = data?.competition;
  if (!team || !c || !team.members.some((m) => m.username === username))
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Bu takım sohbetini göremezsin.</h1>
        <p className="mt-2 text-muted-foreground">Takım sohbetleri sadece üyelere açık.</p>
        <Link href="/yarismalar" className={btn("primary", "md", "mt-6")}>
          Yarışmalara dön
        </Link>
      </Container>
    );

  const open = c.status === "Devam ediyor" && !dayEnded(c.end);
  const repoUrl = team.repoUrl;
  const nameOf = (u: string) => team.members.find((m) => m.username === u)?.name ?? u;
  const left = daysBetween(new Date().toISOString(), c.end);

  return (
    <>
      <PageHero eyebrow={`${c.code} ${c.title}`} title="Takım" highlight={team.name}>
        <Link href={`/yarismalar/${c.id}`} className="mt-8 inline-flex items-center gap-1.5 text-sm text-on-navy-muted hover:text-on-navy">
          <ArrowLeft className="size-4" /> Yarışmaya dön
        </Link>
      </PageHero>
      <Container className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex h-[560px] flex-col overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-6 py-4">
            <b className="font-semibold">Takım sohbeti</b>
            <p className="text-xs text-muted-foreground">Sadece takım üyeleri görür.</p>
          </div>
          <ChatThread
            showAuthors
            messages={chat.map((m) => ({ id: m.id, mine: m.from === "me", author: m.from === "me" ? undefined : nameOf(m.from), text: m.text, at: m.at }))}
            onSend={async (t) => {
              const res = await act(sendTeamMessage({ teamId: id, text: t }));
              if (res) append(id, { id: res.id, from: "me", text: t, at: fmtClock(res.at) });
              return !!res;
            }}
          />
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <h2 className="mb-4 font-semibold">Üyeler</h2>
            <ul className="grid gap-3">
              {team.members.map((m) => (
                <li key={m.username} className="flex items-center gap-3 text-sm">
                  <UserAvatar name={m.name} />
                  <span>
                    <b className="block font-semibold">
                      {m.name}
                      {m.username === username && <span className="ml-1 font-normal text-muted-foreground">(sen)</span>}
                    </b>
                    <span className="text-muted-foreground">{m.field}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold">Teslim</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {open ? `Son teslim ${fmtDate(c.end)} 23:59 · ${left > 0 ? `${left} gün kaldı` : "bugün"}. O anki son commit dondurulur.` : "Teslim süresi doldu."}
            </p>
            {repoUrl && !editing ? (
              <div className="grid gap-3">
                <Pill tone="ok" className="w-fit">
                  <Check className="size-3" /> Teslim edildi
                </Pill>
                <a href={repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold break-all text-primary hover:underline">
                  <GitBranch className="size-4 shrink-0" /> {repoUrl.replace("https://github.com/", "")}
                </a>
                {safeHref(team.demoUrl) && (
                  <a href={safeHref(team.demoUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm break-all text-primary hover:underline">
                    <ExternalLink className="size-4 shrink-0" /> {team.demoUrl}
                  </a>
                )}
                {open && (
                  <button onClick={() => setEditing(true)} className={btn("ghost", "sm", "w-fit")}>
                    Linkleri değiştir
                  </button>
                )}
              </div>
            ) : (
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!parseRepoUrl(repo)) return setErr("Geçerli bir GitHub repo linki gir.");
                  if (!/^https:\/\//.test(demo.trim())) return setErr("Demo linki https:// ile başlamalı (ör. Vercel adresi).");
                  setErr("");
                  setBusy(true);
                  const ok = await act(submitTeamRepo({ teamId: id, repoUrl: repo, demoUrl: demo.trim() }));
                  setBusy(false);
                  if (!ok) return;
                  setEditing(false);
                  toast.success("Teslim alındı", { description: "Süre bitene kadar değiştirebilirsin; testler demo linkine karşı çalışır." });
                  router.refresh();
                }}
              >
                <input className={inputClass} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/takim/repo" aria-label="GitHub reposu" />
                <input className={inputClass} value={demo} onChange={(e) => setDemo(e.target.value)} placeholder="https://takim.vercel.app" aria-label="Demo linki" />
                <p className="text-xs text-muted-foreground">Repo yarışma başladıktan sonra açılmış olmalı; demo teslim anında açılmalı (Vercel ücretsiz).</p>
                {err && <p className="text-sm text-destructive">{err}</p>}
                <button disabled={busy || !open} className={btn("primary")}>
                  {busy ? "Gönderiliyor…" : "Teslim et"}
                </button>
              </form>
            )}
          </Card>

          {open && (
            <Card>
              <h2 className="mb-1 font-semibold">Açık testler</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Şartnamedeki {c.tests.filter((t) => t.public).length} açık testi demona karşı çalıştır (takım başına günde 3). Puanı gizli testler verir.
              </p>
              {team.publicRun && (
                <ul className="mb-4 grid gap-1.5">
                  {team.publicRun.tests.map((t) => (
                    <li key={t.title} className="flex items-start gap-2 text-xs">
                      {t.passed ? <CircleCheck className="size-3.5 shrink-0 text-ok" /> : <CircleX className="size-3.5 shrink-0 text-destructive" />} {t.title}
                    </li>
                  ))}
                  <li className="pt-1 text-xs text-muted-foreground">
                    Son deneme: {team.publicRun.passed}/{team.publicRun.total} · {fmtDate(team.publicRun.at)}
                  </li>
                </ul>
              )}
              <button
                disabled={running || !team.demoUrl}
                onClick={async () => {
                  setRunning(true);
                  const ok = await act(runPublicTests(id));
                  setRunning(false);
                  if (ok) toast.success("Testler başlatıldı", { description: "Birkaç dakika içinde sonuç bildirim olarak gelecek." });
                }}
                className={btn("outline", "md", "w-full")}
              >
                <FlaskConical /> {running ? "Başlatılıyor…" : "Açık testleri çalıştır"}
              </button>
              {!team.demoUrl && <p className="mt-2 text-xs text-muted-foreground">Önce demo linkini teslim et.</p>}
            </Card>
          )}
        </aside>
      </Container>
    </>
  );
}
