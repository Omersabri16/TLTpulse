"use client";

import { ArrowLeft, ArrowUpRight, Check, CircleDot, GitBranch, MessageSquare, Star, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/brand";
import { Modal } from "@/components/modal";
import { Card, Container, PageHero, PageShell, Pill } from "@/components/page-shell";
import { PeerRatingDialog } from "@/components/peer-rating-dialog";
import { Progress } from "@/components/ui/progress";
import { btn, inputClass } from "@/lib/btn";
import { daysBetween, fmtDate, teamOf } from "@/lib/competitions";
import { findCompetition } from "@/lib/mock";
import { peerPoints } from "@/lib/score";
import { useApp } from "@/lib/store";
import type { Competition, Field, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((b) => (
        <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {b}
        </li>
      ))}
    </ul>
  );
}

function Members({ team, me }: { team: Team; me?: string }) {
  return (
    <ul className="grid gap-2.5">
      {team.members.map((m) => (
        <li key={m.username} className="flex items-center gap-3 text-sm">
          <UserAvatar name={m.name} className="size-9 text-xs" />
          <Link href={m.username === me ? "/profil" : `/u/${m.username}`} className="font-medium hover:underline">
            {m.name}
            {m.username === me && <span className="ml-1.5 text-xs text-muted-foreground">(sen)</span>}
          </Link>
          <span className="ml-auto text-xs text-muted-foreground">{m.field}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Başvurular açık: detaylar ----------

function OpenView({ c }: { c: Competition }) {
  const profile = useApp((s) => s.profile);
  const applied = useApp((s) => s.applications[c.id]);
  const apply = useApp((s) => s.apply);
  const withdraw = useApp((s) => s.withdraw);
  const notify = useApp((s) => s.notify);
  const [confirm, setConfirm] = useState<Field | null>(null);
  const [note, setNote] = useState("");

  const timeline = [
    { label: "Son başvuru", date: c.applyDeadline },
    { label: "Takımlar kurulur", date: addDays(c.applyDeadline, 1) },
    { label: "Geliştirme başlar", date: c.start },
    { label: "GitHub teslimi", date: c.end },
    { label: "Sonuçlar", date: addDays(c.end, 2) },
  ];

  return (
    <Container className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-6">
        <Block title="Problem">
          <p className="leading-relaxed text-muted-foreground">{c.description}</p>
        </Block>
        <Block title="Pozisyonlar">
          <p className="mb-4 text-sm text-muted-foreground">Tek bir pozisyona başvurabilirsin. Başvuru bitince sistem her pozisyonu dolu, seviyeleri dengeli takımlar kurar.</p>
          <ul className="grid gap-3">
            {c.positions.map((p) => {
              const mine = applied === p.field;
              const yours = profile?.field === p.field;
              return (
                <li key={p.field} className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", mine && "border-primary bg-secondary")}>
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="font-semibold">{p.field}</b>
                      {yours && <Pill tone="lav">Senin alanın</Pill>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Takım başına {p.perTeam} kişi · {p.applicants + (mine ? 1 : 0)} başvuru
                    </p>
                  </div>
                  {mine ? (
                    <div className="flex items-center gap-2">
                      <Pill tone="ok">
                        <Check className="size-3" /> Başvurdun
                      </Pill>
                      <button
                        onClick={() => {
                          withdraw(c.id);
                          toast("Başvurun geri çekildi");
                        }}
                        className={btn("ghost", "sm")}
                      >
                        Geri çek
                      </button>
                    </div>
                  ) : (
                    <button disabled={!!applied} onClick={() => setConfirm(p.field)} className={btn(yours ? "primary" : "outline", "md")}>
                      Başvur
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>
        <Block title="Beklentiler">
          <Bullets items={c.brief} />
        </Block>
        <Block title="Teslim edilecekler">
          <Bullets items={c.deliverables} />
        </Block>
      </div>

      <aside className="grid content-start gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Takvim</h2>
          <ol className="relative grid gap-4 border-l pl-5">
            {timeline.map((t, i) => (
              <li key={t.label} className="relative text-sm">
                <span className={cn("absolute top-1 -left-[26px] size-3 rounded-full border-2 border-card", i === 0 ? "bg-primary" : "bg-muted-foreground/30")} />
                <b className="block font-semibold">{t.label}</b>
                <span className="text-muted-foreground">{fmtDate(t.date)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="rounded-3xl bg-navy p-6 text-on-navy">
          <h2 className="mb-4 font-semibold">Kazanacağın puan</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
            <dt className="text-on-navy-muted">Tamamlayınca</dt>
            <dd className="font-semibold text-cyan">+4</dd>
            <dt className="text-on-navy-muted">1. takım</dt>
            <dd className="font-semibold text-cyan">+8</dd>
            <dt className="text-on-navy-muted">2. takım</dt>
            <dd className="font-semibold text-cyan">+6</dd>
            <dt className="text-on-navy-muted">3. takım</dt>
            <dd className="font-semibold text-cyan">+4</dd>
            <dt className="text-on-navy-muted">Akran puanı</dt>
            <dd className="font-semibold text-cyan">15&apos;e kadar</dd>
          </dl>
        </div>
      </aside>

      <Modal open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={`${confirm} pozisyonuna başvur`} description={`${c.code} ${c.title} · Son başvuru ${fmtDate(c.applyDeadline)}`}>
        <div className="grid gap-4">
          {confirm && profile?.field && confirm !== profile.field && (
            <p className="rounded-2xl bg-warn-bg p-3 text-sm text-warn">Profilindeki alan {profile.field}. Farklı bir pozisyona başvurabilirsin; takım kurulurken projelerine bakılır.</p>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Takımına bir not (isteğe bağlı)
            <textarea className={cn(inputClass, "h-auto min-h-24 py-3")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Daha önce PostGIS ile çalıştım, harita kısmını alabilirim." />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button
              onClick={() => {
                apply(c.id, confirm!);
                notify(`${c.code} başvurun alındı. Takımlar ${fmtDate(addDays(c.applyDeadline, 1))} tarihinde kurulacak.`, `/yarismalar/${c.id}`);
                toast.success("Başvurun alındı", { description: "Takımın kurulunca bildirim alacaksın." });
                setConfirm(null);
                setNote("");
              }}
              className={btn("primary")}
            >
              Başvuruyu gönder
            </button>
          </div>
        </div>
      </Modal>
    </Container>
  );
}

// ---------- Devam ediyor: yarışmayı keşfet ----------

function OngoingView({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const submissions = useApp((s) => s.submissions);
  const mine = teamOf(c, username);
  const total = daysBetween(c.start, c.end);
  const passed = Math.min(total, Math.max(0, daysBetween(c.start, new Date().toISOString())));
  const teams = [...c.teams].sort((a, b) => (a.id === mine?.id ? -1 : b.id === mine?.id ? 1 : 0));

  return (
    <Container className="grid gap-6">
      <Card className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {passed}. gün / {total}
            </span>
            <span className="text-muted-foreground">Teslim: {fmtDate(c.end)}</span>
          </div>
          <Progress value={(passed / total) * 100} />
        </div>
        {mine && (
          <Link href={`/takim/${mine.id}`} className={btn("primary")}>
            <MessageSquare /> Takımına git
          </Link>
        )}
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Takımlar</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const repo = submissions[t.id] ?? t.repoUrl;
            return (
              <Card key={t.id} className={cn(t.id === mine?.id && "border-primary ring-1 ring-primary")}>
                <div className="mb-4 flex items-center justify-between">
                  <b className="text-lg font-semibold">
                    {t.name}
                    {t.id === mine?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">Senin takımın</span>}
                  </b>
                  {repo ? (
                    <Pill tone="ok">
                      <Check className="size-3" /> Teslim etti
                    </Pill>
                  ) : (
                    <Pill tone="warn">
                      <CircleDot className="size-3" /> Çalışıyor
                    </Pill>
                  )}
                </div>
                <Members team={t} me={username} />
                {repo && (
                  <a href={repo} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                    <GitBranch className="size-4" /> Repo
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Block title="Beklentiler">
          <Bullets items={c.brief} />
        </Block>
        <Block title="Teslim edilecekler">
          <Bullets items={c.deliverables} />
        </Block>
      </div>
    </Container>
  );
}

// ---------- Tamamlandı: sonuçlar ----------

function ResultsView({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const peerGiven = useApp((s) => s.peerGiven);
  const peerReceived = useApp((s) => s.peerReceived);
  const [rating, setRating] = useState(false);
  const ranked = [...c.teams].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const podium = ranked.slice(0, 3);
  const mine = teamOf(c, username);
  const received = peerReceived.filter((p) => p.competitionId === c.id);
  const avg = received.length ? received.reduce((a, r) => a + r.stars, 0) / received.length : 0;
  const medal = ["bg-cyan text-navy", "bg-lav text-secondary-foreground", "bg-muted text-foreground"];

  return (
    <Container className="grid gap-8">
      {mine && (
        <div className="grid gap-4 rounded-3xl border border-primary/30 bg-secondary p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="text-secondary-foreground">
            <p className="text-lg font-semibold">
              Takımın {mine.name} {mine.rank}. oldu.
            </p>
            <p className="mt-1 text-sm">
              Yarışmadan +{4 + (mine.rank === 1 ? 8 : mine.rank === 2 ? 6 : mine.rank === 3 ? 4 : 0)} puan
              {received.length > 0 && ` · Takım arkadaşlarından ortalama ${avg.toFixed(1)}/5 akran puanı (+${peerPoints(received)})`}
            </p>
          </div>
          {peerGiven[mine.id] ? (
            <Pill tone="ok" className="justify-self-start">
              <Check className="size-3" /> Arkadaşlarını puanladın
            </Pill>
          ) : (
            <button onClick={() => setRating(true)} className={btn("primary")}>
              <Star /> Takım arkadaşlarını puanla
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {podium.map((t, i) => (
          <article key={t.id} className={cn("flex flex-col rounded-3xl border bg-card p-6", i === 0 && "md:-mt-4 border-cyan")}>
            <div className="flex items-center justify-between">
              <span className={cn("grid size-12 place-items-center rounded-2xl text-xl font-semibold", medal[i])}>{t.rank}</span>
              <span className="text-sm text-muted-foreground">
                Jüri: <b className="text-foreground">{t.juryScore}</b>
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold">
              {i === 0 && <Trophy className="mr-2 inline size-5 text-cyan-ink" />}
              {t.name}
            </h2>
            <div className="mt-4 mb-5">
              <Members team={t} me={username} />
            </div>
            {t.repoUrl && (
              <a href={t.repoUrl} target="_blank" rel="noreferrer" className={btn("outline", "md", "mt-auto")}>
                <GitBranch /> {t.repoUrl.replace("https://github.com/", "")}
              </a>
            )}
          </article>
        ))}
      </div>

      {ranked.length > 3 && (
        <Card className="p-0">
          <h2 className="border-b px-6 py-4 font-semibold">Diğer takımlar</h2>
          <ul>
            {ranked.slice(3).map((t) => (
              <li key={t.id} className="flex flex-col gap-2 border-b px-6 py-4 text-sm last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-4">
                  <b className="w-6 tabular-nums">{t.rank}</b>
                  <b className="font-semibold">{t.name}</b>
                  <span className="text-muted-foreground">{t.members.map((m) => `${m.name} (${m.field})`).join(", ")}</span>
                </span>
                {t.repoUrl && (
                  <a href={t.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    Repo <ArrowUpRight className="size-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {mine && <PeerRatingDialog team={mine} open={rating} onOpenChange={setRating} />}
    </Container>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const c = findCompetition(id);
  if (!c)
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Yarışma bulunamadı.</h1>
        <Link href="/yarismalar" className={btn("primary", "md", "mt-6")}>
          Yarışmalara dön
        </Link>
      </Container>
    );

  const total = c.positions.reduce((a, p) => a + p.applicants, 0);
  return (
    <>
      <PageHero
        eyebrow={`${c.code} · ${c.theme}`}
        title={c.title}
        subtitle={c.tagline}
        right={
          <div className="grid gap-2 text-sm text-on-navy-muted sm:text-right">
            <span className={cn("w-fit rounded-full px-3 py-1 text-xs sm:justify-self-end", c.status === "Başvurular açık" ? "border border-cyan text-cyan" : "bg-navy-2 text-on-navy")}>{c.status}</span>
            <span className="inline-flex items-center gap-1.5 sm:justify-end">
              <Users className="size-4" /> {c.status === "Başvurular açık" ? `${total} başvuru` : `${c.teams.length} takım`}
            </span>
            <span>
              {fmtDate(c.start)} – {fmtDate(c.end)}
            </span>
          </div>
        }
      >
        <Link href="/yarismalar" className="mt-8 inline-flex items-center gap-1.5 text-sm text-on-navy-muted hover:text-on-navy">
          <ArrowLeft className="size-4" /> Tüm yarışmalar
        </Link>
      </PageHero>
      {c.status === "Başvurular açık" && <OpenView c={c} />}
      {c.status === "Devam ediyor" && <OngoingView c={c} />}
      {c.status === "Tamamlandı" && <ResultsView c={c} />}
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Detail />
    </PageShell>
  );
}
