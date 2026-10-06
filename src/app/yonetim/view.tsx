"use client";

import { Ban, CalendarClock, CircleCheck, CircleX, FlaskConical, Play, Plus, RefreshCw, Sparkles, Trash2, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  cancelCompetition,
  closeReport,
  closeSeasonNow,
  createCompetition,
  deleteDraft,
  draftSpecAction,
  evaluateNow,
  formTeamsNow,
  generateTestsAction,
  publishNow,
  pushTestsAction,
  queueCompetition,
  runDailyNow,
  setSuspended,
  validateTestsAction,
} from "@/app/actions/admin";
import { Choice, Field, Modal } from "@/components/modal";
import { Card, Container, PageHero, Pill } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import type { AdminCompetition, AdminData } from "@/lib/server/admin-data";
import { COMPETITION_MAX, TEAM_FIELDS } from "@/lib/score";
import { useAct } from "@/lib/store";
import type { CompetitionSpec, Difficulty } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BankItem {
  id: string;
  title: string;
  tagline: string;
  difficulty: Difficulty;
  applyDays: number;
  buildDays: number;
  hiddenCount: number;
  publicCount: number;
}

const CRITERIA: [string, string, string, string][] = [
  ["Ne yapılıyor", "Tek özellik, ekle / listele / sil", "Giriş, veritabanı, API, birden fazla ekran", "Gerçek zamanlı, birden fazla servis, rol / yetki, eşzamanlılık"],
  ["Takım", "2 kişi (Frontend + Backend)", "3 kişi (+ Veritabanı)", "4 kişi (+ DevOps)"],
  ["Süre", "2 hafta", "3 hafta", "4 hafta"],
  ["Gizli test", "~10", "~20", "~30"],
  ["En yüksek puan", "100", "150", "200"],
];

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const todayTR = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", ok ? "text-ok" : "text-muted-foreground")}>
      {ok ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />} {label}
    </span>
  );
}

export function AdminView({ data, bank }: { data: AdminData; bank: BankItem[] }) {
  const act = useAct();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [tests, setTests] = useState<{ id: string; acik: string; gizli: string } | null>(null);
  const [validate, setValidate] = useState<AdminCompetition | null>(null);
  const [sampleUrl, setSampleUrl] = useState("");
  const [cancel, setCancel] = useState<AdminCompetition | null>(null);
  const [reason, setReason] = useState("");
  const [season, setSeason] = useState(false);
  const [seasonConfirm, setSeasonConfirm] = useState("");
  const [report, setReport] = useState<string>("");

  const run = async <T,>(key: string, p: Promise<{ ok: true; data: T } | { ok: false; error: string }>, success?: string) => {
    setBusy(key);
    const r = await act(p);
    setBusy("");
    if (r === null) return null;
    if (success) toast.success(success);
    router.refresh();
    return r;
  };

  const actions = (c: AdminCompetition) => {
    const b = (key: string, label: ReactNode, fn: () => void, variant: "outline" | "primary" | "ghost" = "outline") => (
      <button key={key} disabled={!!busy} onClick={fn} className={btn(variant, "sm")}>
        {busy === `${key}:${c.id}` ? <RefreshCw className="animate-spin" /> : null}
        {label}
      </button>
    );
    const list: ReactNode[] = [];
    if (c.status === "Taslak") {
      list.push(
        b("test", <><Wand2 /> Testleri üret</>, async () => {
          const r = await run(`test:${c.id}`, generateTestsAction(c.id));
          if (r) setTests({ id: c.id, ...r });
        }),
        b("dogrula", <><FlaskConical /> Testleri doğrula</>, () => {
          setSampleUrl("");
          setValidate(c);
        }),
        b("sira", <><CalendarClock /> Sıraya koy</>, () => run(`sira:${c.id}`, queueCompetition(c.id), "Sıraya kondu; şartname ve testler kilitlendi."), "primary"),
        b("sil", <><Trash2 /> Sil</>, () => run(`sil:${c.id}`, deleteDraft(c.id), "Taslak silindi"), "ghost"),
      );
    }
    if (c.status === "Sırada") list.push(b("ac", <><Play /> Şimdi aç</>, () => run(`ac:${c.id}`, publishNow(c.id), "Başvurulara açıldı"), "primary"));
    if (c.status === "Başvurular açık")
      list.push(
        b("takim", <><Users /> Takımları şimdi kur</>, async () => {
          const r = await run(`takim:${c.id}`, formTeamsNow(c.id));
          if (r) toast(r.cancelled ? "Yeterli başvuru yok; yarışma iptal edildi." : `${r.teams} takım kuruldu, ${r.substitutes} yedek.`);
        }),
      );
    if (c.status === "Devam ediyor")
      list.push(
        b("degerlendir", <><Play /> Şimdi değerlendir</>, async () => {
          const r = await run(`degerlendir:${c.id}`, evaluateNow(c.id));
          if (r) toast(r.dispatched ? `Commit'ler donduruldu; ${r.teams} takımın gizli testleri Actions'ta başladı.` : "Değerlendirilecek takım kalmadı; sonuçlar yazıldı.");
        }, "primary"),
      );
    if (!["Tamamlandı", "İptal", "Taslak"].includes(c.status))
      list.push(
        b("iptal", <><Ban /> İptal</>, () => {
          setReason("");
          setCancel(c);
        }, "ghost"),
      );
    return list;
  };

  return (
    <>
      <PageHero eyebrow="Sadece ekip" title="Yönetim" subtitle="Yarışmayı tanımla, sıraya koy, şikayetlere bak. Puana ve sonuca dokunulamaz; değerlendirmeyi kod yapar." />
      <Container className="grid gap-6">
        <Section
          title="Durum"
          action={
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!!busy}
                onClick={async () => {
                  const r = await run("gunluk", runDailyNow());
                  if (r) setReport(JSON.stringify(r, null, 2));
                }}
                className={btn("outline", "sm")}
              >
                {busy === "gunluk" ? <RefreshCw className="animate-spin" /> : <Play />} Günlük işi şimdi çalıştır
              </button>
              <button disabled={!!busy || !data.season} onClick={() => setSeason(true)} className={btn("outline", "sm", "border-destructive text-destructive")}>
                Sezonu bitir
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Sezon</p>
              <p className="font-semibold">{data.season?.name ?? "Açık sezon yok"}</p>
              {data.season && <p className="text-xs text-muted-foreground">Bitiş: {fmtDate(data.season.endsAt)}</p>}
              <p className="text-xs text-muted-foreground">
                Bugün bitse: {data.seasonPreview.promoted} yükselir, {data.seasonPreview.relegated} düşer, {data.seasonPreview.champions} şampiyon
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gemini bugün</p>
              <p className="font-semibold">
                {data.gemini.used} / {data.gemini.budget}
              </p>
              <p className="text-xs text-muted-foreground">{Object.entries(data.gemini.byKind).map(([k, v]) => `${k} ${v}`).join(" · ") || "kullanım yok"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bekleyenler</p>
              <p className="text-sm">{data.pendingProjects} proje analizi · {data.pendingCredentials} Certifier sertifikası</p>
            </div>
            <div className="grid gap-1">
              <Flag ok={data.config.eval} label="Değerlendirme reposu" />
              <Flag ok={data.config.cron} label="CRON_SECRET" />
              <Flag ok={data.config.githubToken} label="GITHUB_TOKEN" />
              <Flag ok={data.config.certifier} label="Certifier" />
            </div>
          </div>
          {report && <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-muted p-4 text-xs">{report}</pre>}
        </Section>

        <Section
          title="Yarışmalar"
          action={
            <button onClick={() => setCreating(true)} className={btn("primary", "sm")}>
              <Plus /> Yeni yarışma
            </button>
          }
        >
          <ul className="divide-y">
            {data.competitions.map((c) => (
              <li key={c.id} className="grid gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/yarismalar/${c.id}`} className="font-semibold hover:underline">
                    {c.code} {c.title}
                  </Link>
                  <Pill tone={c.status === "Tamamlandı" ? "ok" : c.status === "İptal" ? "danger" : c.status === "Taslak" ? "muted" : "lav"}>{c.status}</Pill>
                  <Pill>{c.difficulty} · {COMPETITION_MAX[c.difficulty]}</Pill>
                  {c.locked && <Pill tone="muted">Kilitli</Pill>}
                  {c.isDemo && <Pill tone="warn">Örnek</Pill>}
                  {c.calibration && <Pill tone={c.calibration === "Dengeli" ? "ok" : "warn"}>{c.calibration}</Pill>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.specId ? `Şartname: ${c.specId}` : "Şartname: özel"} · yayın {c.publishOn ? fmtDate(c.publishOn) : "-"} · son başvuru {fmtDate(c.applyDeadline)} · teslim {fmtDate(c.end)} · {c.applicants} başvuru · {c.teams} takım
                  {c.status === "Taslak" && ` · testler ${c.testsVerified || bank.some((x) => x.id === c.specId) ? "doğrulandı" : "doğrulanmadı"}`}
                  {c.validation && ` · son doğrulama: örnek ${c.validation.sample_passed}/${c.validation.sample_total}, boş proje ${c.validation.blank_passed}`}
                  {c.lastRun && ` · son iş akışı: ${c.lastRun.kind} ${c.lastRun.status.toLowerCase()} (${fmtDate(c.lastRun.at)})`}
                </p>
                <div className="flex flex-wrap gap-2">{actions(c)}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`Şikayetler (${data.reports.length})`}>
          {data.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Açık şikayet yok.</p>
          ) : (
            <ul className="divide-y">
              {data.reports.map((r) => (
                <li key={r.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="text-sm">
                    <p>
                      <b>{r.type}</b>
                      {r.target && (
                        <>
                          {" "}
                          ·{" "}
                          <Link href={`/u/${r.target.username}`} className="font-semibold text-primary hover:underline">
                            {r.target.name}
                          </Link>
                        </>
                      )}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({r.reporter} · {fmtDate(r.at)} · {r.targetId})
                      </span>
                    </p>
                    <p className="text-muted-foreground">{r.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={!!busy} onClick={() => run(`rapor:${r.id}`, closeReport(r.id), "Kapatıldı")} className={btn("ghost", "sm")}>
                      Kapat
                    </button>
                    {r.target && !r.target.suspended && (
                      <button disabled={!!busy} onClick={() => run(`ask:${r.id}`, setSuspended({ username: r.target!.username, on: true }), "Kullanıcı askıya alındı")} className={btn("outline", "sm", "border-destructive text-destructive")}>
                        Askıya al
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {data.suspended.length > 0 && (
          <Section title="Askıdaki kullanıcılar">
            <ul className="divide-y">
              {data.suspended.map((u) => (
                <li key={u.username} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {u.name} <span className="text-muted-foreground">@{u.username}</span>
                  </span>
                  <button disabled={!!busy} onClick={() => run(`kaldir:${u.username}`, setSuspended({ username: u.username, on: false }), "Askı kaldırıldı")} className={btn("ghost", "sm")}>
                    Askıyı kaldır
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </Container>

      <CreateDialog open={creating} onOpenChange={setCreating} bank={bank} onCreated={() => router.refresh()} />

      <Modal open={!!tests} onOpenChange={(o) => !o && setTests(null)} title="Gemini'nin ürettiği testler" description="Kontrol et, gerekirse düzelt. Özel değerlendirme reposuna yazılınca örnek çözüme karşı doğrulaman gerekir." className="sm:max-w-4xl">
        {tests && (
          <div className="grid gap-4">
            <Field label="Açık testler (acik.spec.ts)">
              <textarea className={cn(inputClass, "h-56 py-3 font-mono text-xs")} value={tests.acik} onChange={(e) => setTests({ ...tests, acik: e.target.value })} />
            </Field>
            <Field label="Gizli testler (gizli.spec.ts)">
              <textarea className={cn(inputClass, "h-72 py-3 font-mono text-xs")} value={tests.gizli} onChange={(e) => setTests({ ...tests, gizli: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTests(null)} className={btn("ghost")}>
                Vazgeç
              </button>
              <button
                disabled={!!busy}
                onClick={async () => {
                  if (await run("push", pushTestsAction({ id: tests.id, acik: tests.acik, gizli: tests.gizli }), "Testler özel repoya yazıldı")) setTests(null);
                }}
                className={btn("primary")}
              >
                Özel repoya yaz
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!validate} onOpenChange={(o) => !o && setValidate(null)} title="Testleri doğrula" description="Testler örnek çözümde %100 geçmeli, boş bir projede geçmemeli. Sonuç birkaç dakika içinde burada görünür.">
        {validate && (
          <div className="grid gap-4">
            {!bank.some((b) => b.id === validate.specId) && (
              <Field label="Örnek çözümün demo adresi" hint="Yeni şartname için şartnameyi karşılayan bir örnek uygulama yayınla.">
                <input className={inputClass} value={sampleUrl} onChange={(e) => setSampleUrl(e.target.value)} placeholder="https://ornek-cozum.vercel.app" />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setValidate(null)} className={btn("ghost")}>
                Vazgeç
              </button>
              <button
                disabled={!!busy}
                onClick={async () => {
                  if (await run("dogrula", validateTestsAction({ id: validate.id, sampleUrl }), "Doğrulama başladı")) setValidate(null);
                }}
                className={btn("primary")}
              >
                Başlat
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!cancel} onOpenChange={(o) => !o && setCancel(null)} title={`${cancel?.code} iptal edilsin mi?`} description="Kimse puan almaz; başvuranlara ve takımlara bildirim gider.">
        <div className="grid gap-4">
          <Field label="Sebep">
            <textarea className={cn(inputClass, "h-auto min-h-20 py-3")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ör. gizli testlerden birinde hata çıktı." />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancel(null)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button
              disabled={!!busy || reason.trim().length < 5}
              onClick={async () => {
                if (cancel && (await run("iptal", cancelCompetition({ id: cancel.id, reason }), "Yarışma iptal edildi"))) setCancel(null);
              }}
              className={btn("primary", "md", "bg-destructive hover:bg-destructive/90")}
            >
              İptal et
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={season} onOpenChange={setSeason} title="Sezonu şimdi bitir" description="Her ligin ilk 20'si (100+ puanla) yükselir, Orta ve Kıdemli'nin son 20'si (100 altı) düşer, şampiyonlar rozet alır, herkesin sezon puanı sıfırlanır ve yeni sezon başlar. Geri alınamaz.">
        <div className="grid gap-4">
          <Field label='Onay için "SEZONU BİTİR" yaz'>
            <input className={inputClass} value={seasonConfirm} onChange={(e) => setSeasonConfirm(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => setSeason(false)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button
              disabled={!!busy || seasonConfirm !== "SEZONU BİTİR"}
              onClick={async () => {
                const r = await run("sezon", closeSeasonNow(seasonConfirm));
                if (r) {
                  toast.success(`Sezon kapandı: ${r.promoted} yükselme, ${r.relegated} düşme, ${r.champions} şampiyon.`);
                  setSeason(false);
                  setSeasonConfirm("");
                }
              }}
              className={btn("primary", "md", "bg-destructive hover:bg-destructive/90")}
            >
              Sezonu bitir
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CreateDialog({ open, onOpenChange, bank, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; bank: BankItem[]; onCreated: () => void }) {
  return open ? <CreateBody onOpenChange={onOpenChange} bank={bank} onCreated={onCreated} /> : null;
}

function CreateBody({ onOpenChange, bank, onCreated }: { onOpenChange: (o: boolean) => void; bank: BankItem[]; onCreated: () => void }) {
  const act = useAct();
  const [difficulty, setDifficulty] = useState<Difficulty>("Kolay");
  const [specId, setSpecId] = useState<string>(bank.find((b) => b.difficulty === "Kolay")?.id ?? "");
  const [custom, setCustom] = useState<CompetitionSpec | null>(null);
  const [title, setTitle] = useState(bank.find((b) => b.difficulty === "Kolay")?.title ?? "");
  const [tagline, setTagline] = useState(bank.find((b) => b.difficulty === "Kolay")?.tagline ?? "");
  const [idea, setIdea] = useState("");
  const pick = bank.find((b) => b.id === specId);
  const base = todayTR();
  const [publishOn, setPublishOn] = useState(base);
  const [applyDeadline, setApplyDeadline] = useState(addDays(base, 7));
  const [start, setStart] = useState(addDays(base, 9));
  const [end, setEnd] = useState(addDays(base, 9 + 14));
  const [busy, setBusy] = useState("");

  const choose = (d: Difficulty) => {
    setDifficulty(d);
    const b = bank.find((x) => x.difficulty === d);
    setSpecId(b?.id ?? "");
    setCustom(null);
    if (b) {
      setTitle(b.title);
      setTagline(b.tagline);
    }
    const days = d === "Kolay" ? 14 : d === "Orta" ? 21 : 28;
    setEnd(addDays(start, days));
  };

  return (
    <Modal open onOpenChange={onOpenChange} title="Yeni yarışma" description="Zorluğu ölçüte göre seç, şartnameyi bankadan al ya da Gemini'ye taslak yazdır. Taslak olarak kaydedilir." className="sm:max-w-3xl">
      <div className="grid gap-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1.5" />
                {(["Kolay", "Orta", "Zor"] as Difficulty[]).map((d) => (
                  <th key={d} className={cn("py-1.5", d === difficulty && "text-primary")}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {CRITERIA.map(([k, ...v]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 text-muted-foreground">{k}</td>
                  {v.map((x, i) => (
                    <td key={i} className={cn("py-1.5 pr-3", ["Kolay", "Orta", "Zor"][i] === difficulty && "font-semibold")}>
                      {x}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Field label="Zorluk">
          <Choice value={difficulty} onChange={choose} options={["Kolay", "Orta", "Zor"]} />
        </Field>
        <p className="text-xs text-muted-foreground">Pozisyonlar: {TEAM_FIELDS[difficulty].join(" + ")} · en fazla {COMPETITION_MAX[difficulty]} puan</p>

        <Field label="Şartname">
          <div className="grid gap-2">
            {bank
              .filter((b) => b.difficulty === difficulty)
              .map((b) => (
                <label key={b.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm", specId === b.id && !custom && "border-primary bg-secondary")}>
                  <input
                    type="radio"
                    name="spec"
                    checked={specId === b.id && !custom}
                    onChange={() => {
                      setSpecId(b.id);
                      setCustom(null);
                      setTitle(b.title);
                      setTagline(b.tagline);
                    }}
                    className="mt-1"
                  />
                  <span>
                    <b>{b.title}</b> <span className="text-muted-foreground">· {b.tagline}</span>
                    <span className="block text-xs text-muted-foreground">
                      Bankadan · {b.publicCount} açık + {b.hiddenCount} gizli test · örnek çözümle doğrulandı
                    </span>
                  </span>
                </label>
              ))}
            <div className={cn("grid gap-2 rounded-2xl border p-3", custom && "border-primary bg-secondary")}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4" /> Gemini ile taslak oluştur
              </span>
              <textarea className={cn(inputClass, "h-auto min-h-16 py-2 text-sm")} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Ör. kampüs yemekhanesi için menü oylama; öğrenciler beğenir, yemekhane görevlisi menü ekler." />
              <button
                disabled={!!busy || title.trim().length < 3}
                onClick={async () => {
                  setBusy("taslak");
                  const r = await act(draftSpecAction({ title, difficulty, idea }));
                  setBusy("");
                  if (r) {
                    setCustom(r);
                    setSpecId("");
                    toast.success("Taslak hazır", { description: "Kaydedince testleri üretip örnek çözümle doğrulaman gerekecek." });
                  }
                }}
                className={btn("outline", "sm", "w-fit")}
              >
                {busy === "taslak" ? <RefreshCw className="animate-spin" /> : <Wand2 />} Taslak oluştur
              </button>
              {custom && (
                <div className="max-h-48 overflow-auto rounded-xl bg-card p-3 text-xs">
                  <p className="font-semibold">{custom.problem}</p>
                  <ul className="mt-2 list-disc pl-4">
                    {custom.api.map((a) => (
                      <li key={a.method + a.path} className="font-mono">
                        {a.method} {a.path}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlık">
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Kısa açıklama">
            <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Yayın (sıradan açılır)">
            <input type="date" className={inputClass} value={publishOn} onChange={(e) => setPublishOn(e.target.value)} />
          </Field>
          <Field label="Son başvuru">
            <input type="date" className={inputClass} value={applyDeadline} onChange={(e) => setApplyDeadline(e.target.value)} />
          </Field>
          <Field label="Başlangıç">
            <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Teslim">
            <input type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {pick && <p className="text-xs text-muted-foreground">Önerilen: {pick.applyDays} gün başvuru, {pick.buildDays} gün geliştirme.</p>}

        <div className="flex justify-end gap-2">
          <button onClick={() => onOpenChange(false)} className={btn("ghost")}>
            Vazgeç
          </button>
          <button
            disabled={!!busy || (!specId && !custom)}
            onClick={async () => {
              setBusy("kaydet");
              const id = await act(createCompetition({ title, tagline, difficulty, specId: custom ? undefined : specId, spec: custom ?? undefined, publishOn, applyDeadline, start, end }));
              setBusy("");
              if (!id) return;
              toast.success(`${id} taslak olarak kaydedildi`);
              onCreated();
              onOpenChange(false);
            }}
            className={btn("primary")}
          >
            {busy === "kaydet" ? "Kaydediliyor…" : "Taslak olarak kaydet"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
