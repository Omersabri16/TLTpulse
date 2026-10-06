"use client";

import { ArrowLeft, Check, CircleCheck, CircleDot, CircleX, ExternalLink, FlaskConical, GitBranch, Hourglass, MessageSquare, Star, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { applyCompetition, withdrawCompetition } from "@/app/actions/competitions";
import { UserAvatar } from "@/components/brand";
import { DifficultyBadge } from "@/components/competition-card";
import { GithubVerify } from "@/components/github-verify";
import { Modal } from "@/components/modal";
import { Card, Container, PageHero, Pill } from "@/components/page-shell";
import { PeerRatingDialog } from "@/components/peer-rating-dialog";
import { Progress } from "@/components/ui/progress";
import { btn, inputClass } from "@/lib/btn";
import { daysBetween, fmtDate, teamOf } from "@/lib/competitions";
import { safeHref } from "@/lib/safe";
import { COVERAGE_WEIGHTS, MIN_COVERAGE, peerPoints } from "@/lib/score";
import { useAct, useApp } from "@/lib/store";
import type { Competition, Field, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const pct = (n: number) => `%${Math.round(n * 100)}`;

function Block({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
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
          {m.username === "silinmis" ? (
            <span className="text-muted-foreground">{m.name}</span>
          ) : (
            <Link href={m.username === me ? "/profil" : `/u/${m.username}`} className="font-medium hover:underline">
              {m.name}
              {m.username === me && <span className="ml-1.5 text-xs text-muted-foreground">(sen)</span>}
            </Link>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {m.field}
            {m.points !== undefined && <b className="ml-2 text-foreground">+{m.points}</b>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Şartname: problem, kullanıcı hikayeleri ve herkesin aynı sunacağı sabit arayüz (API + data-testid). */
export function SpecBlocks({ c }: { c: Competition }) {
  const s = c.spec;
  if (!s)
    return (
      <Block title="Beklentiler">
        <Bullets items={c.brief} />
      </Block>
    );
  return (
    <>
      <Block title="Kullanıcı neler yapabilmeli?">
        <Bullets items={s.stories} />
      </Block>
      <Block title="Sabit arayüz: API">
        <p className="mb-3 text-sm text-muted-foreground">Gizli testler demonu dışarıdan dener; bu uçları aynen sunmalısın. İçini nasıl yapacağın takımına kalmış.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <tbody className="divide-y">
              {s.api.map((e) => (
                <tr key={e.method + e.path} className="align-top">
                  <td className="py-2.5 pr-3">
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">{e.method}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs">{e.path}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {e.request && <span className="block font-mono">{e.request}</span>}
                    <span className="block">{e.response}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
      <Block title="Sabit arayüz: sayfalar (data-testid)">
        <ul className="grid gap-3 text-sm">
          {s.testIds.map((t) => (
            <li key={t.page + t.id}>
              <span className="font-mono text-xs text-muted-foreground">{t.page}</span>
              <p className="font-mono text-xs font-semibold">{t.id}</p>
              <p className="text-xs text-muted-foreground">{t.note}</p>
            </li>
          ))}
        </ul>
      </Block>
      {s.rules.length > 0 && (
        <Block title="Kurallar">
          <Bullets items={s.rules} />
        </Block>
      )}
    </>
  );
}

/** Açık testler (takım kendini deneyebilir) ve gizli test sayısı. */
function TestsBlock({ c, team }: { c: Competition; team?: Team }) {
  const open = c.tests.filter((t) => t.public);
  const hidden = c.tests.filter((t) => !t.public).length;
  const run = team?.publicRun;
  return (
    <Block title="Testler" action={<FlaskConical className="size-5 text-muted-foreground" />}>
      <p className="mb-3 text-sm text-muted-foreground">
        {open.length} açık test (kendini deneyebilirsin) · {hidden} gizli test (puanı bunlar verir, adları sonuçla açıklanır)
      </p>
      <ul className="grid gap-2">
        {open.map((t) => {
          const r = run?.tests.find((x) => x.title.startsWith(t.id + " ") || x.title === t.title);
          return (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              {r ? r.passed ? <CircleCheck className="size-4 text-ok" /> : <CircleX className="size-4 text-destructive" /> : <CircleDot className="size-4 text-muted-foreground" />}
              <span className="font-mono text-xs text-muted-foreground">{t.id}</span> {t.title}
            </li>
          );
        })}
      </ul>
      {run && (
        <p className="mt-3 text-xs text-muted-foreground">
          Takımının son denemesi: {run.passed}/{run.total} · {fmtDate(run.at)}
        </p>
      )}
    </Block>
  );
}

function PointsBox({ c }: { c: Competition }) {
  return (
    <div className="rounded-3xl bg-navy p-6 text-on-navy">
      <h2 className="font-semibold">Kazanacağın puan</h2>
      <p className="mt-2 text-4xl font-semibold text-cyan">en fazla {c.maxPoints}</p>
      <p className="mt-2 text-xs text-on-navy-muted">Sıralama ve kazanan yok. Takım şartnamenin ne kadarını karşıladıysa o kadar puan alır; %{MIN_COVERAGE * 100}&apos;nin altı 0.</p>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
        <dt className="text-on-navy-muted">Gizli kabul testleri</dt>
        <dd className="font-semibold text-cyan">%{COVERAGE_WEIGHTS.correctness * 100}</dd>
        <dt className="text-on-navy-muted">Kalite (Lighthouse, lint, audit, CI)</dt>
        <dd className="font-semibold text-cyan">%{COVERAGE_WEIGHTS.quality * 100}</dd>
        <dt className="text-on-navy-muted">Takım çalışması</dt>
        <dd className="font-semibold text-cyan">%{COVERAGE_WEIGHTS.teamwork * 100}</dd>
        <dt className="text-on-navy-muted">Akran puanı</dt>
        <dd className="font-semibold text-cyan">30&apos;a kadar</dd>
      </dl>
      <p className="mt-4 text-xs text-on-navy-muted">Katkın takım ortalamasının yarısının altındaysa puanın oranında azalır; hiç commit&apos;in yoksa 0. Commit&apos;lerin doğrulanmış GitHub hesabınla eşleştirilir.</p>
    </div>
  );
}

// ---------- Başvurular açık ----------

function OpenView({ c }: { c: Competition }) {
  const profile = useApp((s) => s.profile);
  const applied = useApp((s) => s.applications[c.id]);
  const act = useAct();
  const router = useRouter();
  const [confirm, setConfirm] = useState<Field | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const timeline = [
    { label: "Son başvuru", date: c.applyDeadline },
    { label: "Takımlar kurulur", date: addDays(c.applyDeadline, 1) },
    { label: "Geliştirme başlar", date: c.start },
    { label: "Teslim (commit dondurulur)", date: c.end },
    { label: "Otomatik değerlendirme", date: addDays(c.end, 1) },
  ];

  return (
    <Container className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-6">
        <Block title="Problem">
          <p className="leading-relaxed text-muted-foreground">{c.description}</p>
        </Block>
        <Block title="Pozisyonlar">
          <p className="mb-4 text-sm text-muted-foreground">Herkes her yarışmaya katılabilir. Tek bir pozisyona başvur; başvuru bitince sistem her pozisyonu dolu, seviyeleri dengeli takımlar kurar.</p>
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
                      Takım başına {p.perTeam} kişi · {p.applicants} başvuru
                    </p>
                  </div>
                  {mine ? (
                    <div className="flex items-center gap-2">
                      <Pill tone="ok">
                        <Check className="size-3" /> Başvurdun
                      </Pill>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          const ok = await act(withdrawCompetition(c.id));
                          setBusy(false);
                          if (!ok) return;
                          toast("Başvurun geri çekildi");
                          router.refresh();
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
        <SpecBlocks c={c} />
        <TestsBlock c={c} />
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
        <PointsBox c={c} />
      </aside>

      <Modal open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={`${confirm} pozisyonuna başvur`} description={`${c.code} ${c.title} · Son başvuru ${fmtDate(c.applyDeadline)}`}>
        <div className="grid gap-4">
          {confirm && profile?.field && confirm !== profile.field && (
            <p className="rounded-2xl bg-warn-bg p-3 text-sm text-warn">Profilindeki alan {profile.field}. Farklı bir pozisyona da başvurabilirsin.</p>
          )}
          {profile && !profile.githubVerified && (
            <div className="grid gap-3">
              <p className="rounded-2xl bg-warn-bg p-3 text-sm text-warn">
                GitHub hesabın doğrulanmamış. Yarışma puanı commit&apos;lerinle hesaplanır; teslimden önce doğrula.
                {!profile.github && " Önce Profili düzenle'den GitHub kullanıcı adını ekle."}
              </p>
              <GithubVerify />
            </div>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Takımına bir not (isteğe bağlı)
            <textarea className={cn(inputClass, "h-auto min-h-24 py-3")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Daha önce WebSocket ile çalıştım, canlı kısmı alabilirim." />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirm(null)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await act(applyCompetition({ competitionId: c.id, field: confirm!, note }));
                setBusy(false);
                if (!ok) return;
                toast.success("Başvurun alındı", { description: `Takımlar ${fmtDate(addDays(c.applyDeadline, 1))} tarihinde kurulacak.` });
                setConfirm(null);
                setNote("");
                router.refresh();
              }}
              className={btn("primary")}
            >
              {busy ? "Gönderiliyor…" : "Başvuruyu gönder"}
            </button>
          </div>
        </div>
      </Modal>
    </Container>
  );
}

// ---------- Devam ediyor / değerlendiriliyor ----------

function OngoingView({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const mine = teamOf(c, username);
  const total = Math.max(1, daysBetween(c.start, c.end));
  const passed = Math.min(total, Math.max(0, daysBetween(c.start, new Date().toISOString())));
  const teams = [...c.teams].sort((a, b) => (a.id === mine?.id ? -1 : b.id === mine?.id ? 1 : 0));
  const evaluating = c.status === "Değerlendiriliyor";

  return (
    <Container className="grid gap-6">
      {evaluating ? (
        <div className="flex items-center gap-3 rounded-3xl border border-primary/30 bg-secondary p-5 text-sm text-secondary-foreground">
          <Hourglass className="size-5 shrink-0" />
          Teslim süresi doldu, commit&apos;ler donduruldu. Gizli testler takımların demolarına karşı çalışıyor; karneler birazdan burada.
        </div>
      ) : (
        <Card className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {passed}. gün / {total}
              </span>
              <span className="text-muted-foreground">Teslim: {fmtDate(c.end)} 23:59</span>
            </div>
            <Progress value={(passed / total) * 100} />
          </div>
          {mine && (
            <Link href={`/takim/${mine.id}`} className={btn("primary")}>
              <MessageSquare /> Takımına git
            </Link>
          )}
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Takımlar</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <Card key={t.id} className={cn(t.id === mine?.id && "border-primary ring-1 ring-primary")}>
              <div className="mb-4 flex items-center justify-between">
                <b className="text-lg font-semibold">
                  {t.name}
                  {t.id === mine?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">Senin takımın</span>}
                </b>
                {t.submitted ? (
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
              {t.repoUrl && (
                <a href={t.repoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <GitBranch className="size-4" /> Repo
                </a>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          <SpecBlocks c={c} />
        </div>
        <aside className="grid content-start gap-6">
          <TestsBlock c={c} team={mine} />
          <PointsBox c={c} />
        </aside>
      </div>
    </Container>
  );
}

// ---------- Tamamlandı: takım karneleri ----------

function Meter({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">
          {label} <span className="opacity-70">(%{weight * 100})</span>
        </span>
        <b>{pct(value)}</b>
      </div>
      <Progress value={value * 100} />
    </div>
  );
}

function ReportCard({ t, me, mine }: { t: Team; me: string; mine: boolean }) {
  const r = t.result;
  const hiddenTests = r?.tests.filter((x) => !x.public) ?? [];
  return (
    <article className={cn("flex flex-col rounded-3xl border bg-card p-6", mine && "border-primary ring-1 ring-primary")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">
            {t.name}
            {mine && <span className="ml-2 text-xs font-normal text-muted-foreground">Senin takımın</span>}
          </h3>
          {r?.eliminated ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" /> Elendi: {r.eliminated}
            </p>
          ) : (
            r && (
              <p className="mt-1 text-sm text-muted-foreground">
                Gizli testler {r.hiddenPassed}/{r.hiddenTotal} · şartnamenin <b className="text-foreground">{pct(r.coverage)}</b>&apos;i
              </p>
            )
          )}
        </div>
        <span className={cn("rounded-2xl px-4 py-2 text-center", r?.points ? "bg-navy text-cyan" : "bg-muted text-muted-foreground")}>
          <b className="block text-2xl leading-none font-semibold">{r?.points ?? 0}</b>
          <span className="text-[10px]">puan</span>
        </span>
      </div>

      {r && !r.eliminated && (
        <div className="mt-5 grid gap-3">
          <Meter label="Doğruluk (gizli testler)" value={r.correctness} weight={COVERAGE_WEIGHTS.correctness} />
          <Meter label="Kalite" value={r.quality} weight={COVERAGE_WEIGHTS.quality} />
          <Meter label="Takım çalışması" value={r.teamwork} weight={COVERAGE_WEIGHTS.teamwork} />
          {r.coverage < MIN_COVERAGE && <p className="text-xs text-destructive">Karşılama oranı %{MIN_COVERAGE * 100}&apos;nin altında kaldığı için puan yok.</p>}
          <p className="text-xs text-muted-foreground">
            {r.details.lighthouse && `Lighthouse: erişilebilirlik ${pct(r.details.lighthouse.accessibility)}, performans ${pct(r.details.lighthouse.performance)}, mobil ${pct(r.details.lighthouse.mobile)} · `}
            {r.details.lintErrors !== undefined && `lint hatası ${r.details.lintErrors} · `}
            {r.details.auditHigh !== undefined && `npm audit (yüksek) ${r.details.auditHigh} · `}
            CI {r.details.ci ? "yeşil" : "yok/kırmızı"}
          </p>
        </div>
      )}

      {hiddenTests.length > 0 && (
        <details className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm">
          <summary className="cursor-pointer font-medium">Testler ({hiddenTests.filter((x) => x.passed).length}/{hiddenTests.length} gizli test geçti)</summary>
          <ul className="mt-3 grid gap-1.5">
            {r!.tests.map((x) => (
              <li key={x.id + x.title} className="flex items-start gap-2 text-xs">
                {x.passed ? <CircleCheck className="size-3.5 shrink-0 text-ok" /> : <CircleX className="size-3.5 shrink-0 text-destructive" />}
                <span>
                  {x.title}
                  {x.public && <span className="ml-1 text-muted-foreground">(açık)</span>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-5 mb-5">
        <Members team={t} me={me} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {t.repoUrl && (
          <a href={t.repoUrl} target="_blank" rel="noreferrer" className={btn("outline", "sm")}>
            <GitBranch /> {t.repoUrl.replace("https://github.com/", "")}
          </a>
        )}
        {safeHref(t.demoUrl) && (
          <a href={safeHref(t.demoUrl)} target="_blank" rel="noreferrer" className={btn("ghost", "sm")}>
            Demo <ExternalLink />
          </a>
        )}
      </div>
    </article>
  );
}

function ResultsView({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const peerGiven = useApp((s) => s.peerGiven);
  const peerReceived = useApp((s) => s.peerReceived);
  const [rating, setRating] = useState(false);
  const mine = teamOf(c, username);
  const teams = [...c.teams].sort((a, b) => (a.id === mine?.id ? -1 : b.id === mine?.id ? 1 : 0));
  const received = peerReceived.filter((p) => p.competitionId === c.id);
  const avg = received.length ? received.reduce((a, r) => a + r.stars, 0) / received.length : 0;
  const myPoints = mine?.members.find((m) => m.username === username)?.points ?? 0;

  return (
    <Container className="grid gap-8">
      {mine && (
        <div className="grid gap-4 rounded-3xl border border-primary/30 bg-secondary p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="text-secondary-foreground">
            <p className="text-lg font-semibold">
              {mine.result?.eliminated ? `Takımın ${mine.name} elendi.` : `Takımın ${mine.name} şartnamenin ${pct(mine.result?.coverage ?? 0)}'ini karşıladı.`}
            </p>
            <p className="mt-1 text-sm">
              Yarışmadan +{myPoints} puan
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

      <div>
        <h2 className="mb-1 text-lg font-semibold">Takım karneleri</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Kazanan yok: her takım şartnameyi karşıladığı kadar puan aldı. Değerlendirme tamamen otomatik; testleri ve ölçümleri kod çalıştırdı.
          {c.calibration && c.calibration !== "Dengeli" && ` Kalibrasyon: bu yarışma ${c.calibration.toLowerCase()} çıktı; sonrakiler buna göre ayarlanacak.`}
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {teams.map((t) => (
            <ReportCard key={t.id} t={t} me={username} mine={t.id === mine?.id} />
          ))}
        </div>
      </div>

      {mine && <PeerRatingDialog team={mine} open={rating} onOpenChange={setRating} />}
    </Container>
  );
}

function CancelledView({ c }: { c: Competition }) {
  return (
    <Container className="grid gap-6">
      <div className="flex items-start gap-3 rounded-3xl bg-destructive/10 p-6 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" />
        <div>
          <b className="block">Bu yarışma iptal edildi; kimse puan almadı.</b>
          {c.cancelReason}
        </div>
      </div>
    </Container>
  );
}

export function Detail({ c }: { c: Competition | null }) {
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
        eyebrow={c.code}
        title={c.title}
        subtitle={c.tagline}
        right={
          <div className="grid gap-2 text-sm text-on-navy-muted sm:text-right">
            <span className={cn("w-fit rounded-full px-3 py-1 text-xs sm:justify-self-end", c.status === "Başvurular açık" ? "border border-cyan text-cyan" : "bg-navy-2 text-on-navy")}>{c.status}</span>
            <DifficultyBadge c={c} className="w-fit sm:justify-self-end" />
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
      {(c.status === "Devam ediyor" || c.status === "Değerlendiriliyor") && <OngoingView c={c} />}
      {c.status === "Tamamlandı" && <ResultsView c={c} />}
      {c.status === "İptal" && <CancelledView c={c} />}
    </>
  );
}
