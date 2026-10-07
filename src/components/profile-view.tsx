"use client";

import { Award, BadgeCheck, Check, Clock, Copy, Crown, ExternalLink, Flag, GitBranch, GraduationCap, HeartHandshake, MapPin, MessageSquare, MoreHorizontal, Plus, Quote, ShieldOff, Trophy, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PulseLine, UserAvatar } from "@/components/brand";
import { Modal } from "@/components/modal";
import { Card, Pill } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { safeHref } from "@/lib/safe";
import { levelLabel } from "@/lib/score";
import { toast } from "sonner";
import { useIsClient } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Badge, Certificate, CredentialItem, Difficulty, Education, Experience, Level, Quality, Reference, Skill } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ProfileData {
  username: string;
  name: string;
  headline: string;
  field: string;
  school: string;
  department?: string;
  city: string;
  github: string;
  about: string;
  projects: { id: string; name: string; techs: string[]; description: string; difficulty: Difficulty; quality?: Quality; points?: number; repoUrl?: string }[];
  experiences: Experience[];
  references: Reference[];
  certs: Certificate[];
  competitions: { id: string; label: string; detail: string }[];
  education: Education[];
  skills: Skill[];
  interests: string[];
  connections: { username: string; name: string; field: string }[];
  /** Sezon puanı (lig puanı) */
  score: number;
  /** Tüm zamanların toplamı */
  total: number;
  level: Level;
  rank: { rank: number; of: number };
  badges: Badge[];
  credentials: CredentialItem[];
}

const DIFF_TONE: Record<Difficulty, "ok" | "lav" | "muted"> = { Zor: "ok", Orta: "lav", Kolay: "muted" };

function Section({ title, action, children, empty }: { title: string; action?: ReactNode; children?: ReactNode; empty?: ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children || <p className="text-sm text-muted-foreground">{empty}</p>}
    </Card>
  );
}

export function ProfileView({
  data,
  own,
  actions,
  sidebarTop,
  onAddCert,
  onRequestRef,
  onAddProject,
  onReportProject,
}: {
  data: ProfileData;
  own: boolean;
  actions: ReactNode;
  sidebarTop?: ReactNode;
  onAddCert?: () => void;
  onRequestRef?: (preset?: string) => void;
  onAddProject?: () => void;
  onReportProject?: (id: string, name: string) => void;
}) {
  const approved = data.references.filter((r) => r.status === "Onaylandı");
  const refFor = (type: "experience" | "project" | "certificate", id: string) => data.references.find((r) => r.targetType === type && r.targetId === id);
  const [showConnections, setShowConnections] = useState(false);

  return (
    <>
      {/* Kapak */}
      <section className="bg-navy">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <PulseLine beats={Math.max(1, data.projects.length)} className="text-navy-line" height={150} />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        {/* Kimlik kartı */}
        <Card className="relative -mt-16 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <UserAvatar name={data.name} className="-mt-20 size-28 text-3xl ring-[6px] ring-card sm:-mt-24" />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
                <p className="mt-1 text-muted-foreground">{data.headline || "Başlık eklenmedi"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {data.school && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="size-4" /> {data.school}
                    </span>
                  )}
                  {data.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" /> {data.city}
                    </span>
                  )}
                  {data.github && (
                    <a href={`https://github.com/${data.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <GitBranch className="size-4" /> github.com/{data.github}
                    </a>
                  )}
                  {own ? (
                    <Link href="/baglantilar" className="hover:text-foreground hover:underline">
                      {data.connections.length} bağlantı
                    </Link>
                  ) : (
                    <button onClick={() => setShowConnections(true)} className="hover:text-foreground hover:underline">
                      {data.connections.length} bağlantı
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid content-start gap-6">
            <Section title="Hakkında" empty={own ? "Kendini iki üç cümleyle anlat." : "Henüz yazılmamış."}>
              {data.about && <p className="leading-relaxed text-muted-foreground">{data.about}</p>}
            </Section>

            <Section
              title="Projeler"
              action={
                own && (
                  <div className="flex gap-2">
                    <button onClick={onAddProject} className={btn("outline", "sm")}>
                      <Plus /> Proje ekle
                    </button>
                  </div>
                )
              }
              empty="Henüz proje eklenmedi."
            >
              {data.projects.length > 0 && (
                <ul className="divide-y">
                  {data.projects.map((p) => {
                    const ref = refFor("project", p.id);
                    return (
                      <li key={p.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {p.repoUrl ? (
                              <a href={p.repoUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                                {p.name}
                              </a>
                            ) : (
                              <b className="font-semibold">{p.name}</b>
                            )}
                            <Pill tone="ok">
                              <Check className="size-3" /> Kod
                            </Pill>
                            {ref?.status === "Onaylandı" && <Pill tone="ok">Onaylı</Pill>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                          <p className="mt-1.5 text-xs text-muted-foreground">{p.techs.join(" · ")}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Pill tone={DIFF_TONE[p.difficulty]}>{p.difficulty}</Pill>
                          {p.quality && <Pill>{p.quality}</Pill>}
                          {!own && onReportProject && (
                            <button onClick={() => onReportProject(p.id, p.name)} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`${p.name} projesini şikayet et`} title="Şikayet et">
                              <Flag className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {own && data.projects.length > 0 && (
                <Link href="/projeler" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                  Tüm projeler →
                </Link>
              )}
            </Section>

            <Section
              title="Deneyim"
              action={
                own && (
                  <button onClick={() => onRequestRef?.()} className={btn("outline", "sm")}>
                    <Plus /> Ekle ve onay iste
                  </button>
                )
              }
              empty="Henüz deneyim eklenmedi."
            >
              {data.experiences.length > 0 && (
                <ul className="divide-y">
                  {data.experiences.map((e) => {
                    const ref = refFor("experience", e.id);
                    return (
                      <li key={e.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <b className="font-semibold">{e.title}</b>
                          <p className="text-sm text-muted-foreground">
                            {e.org} · {e.kind}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {e.start}
                            {e.start && " – "}
                            {e.end}
                          </p>
                          {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
                        </div>
                        <div className="shrink-0">
                          {ref?.status === "Onaylandı" ? (
                            <Pill tone="ok">
                              <BadgeCheck className="size-3.5" /> Onaylı · {ref.relation.toLowerCase()}
                            </Pill>
                          ) : ref?.status === "Bekliyor" ? (
                            <Pill tone="warn">
                              <Clock className="size-3.5" /> Onay bekliyor
                            </Pill>
                          ) : ref?.status === "Reddedildi" ? (
                            <Pill tone="danger">
                              <X className="size-3.5" /> Reddedildi
                            </Pill>
                          ) : own ? (
                            <button onClick={() => onRequestRef?.(`exp:${e.id}`)} className={btn("lav", "sm")}>
                              Onay iste
                            </button>
                          ) : (
                            <Pill tone="muted">Beyan</Pill>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {(approved.length > 0 || own) && (
              <Section title="Referanslar" empty="Amirin ya da hocan onay verip yorum yazınca burada görünür.">
                {approved.length > 0 && (
                  <ul className="grid gap-4">
                    {approved.map((r) => (
                      <li key={r.token} className="rounded-2xl bg-muted/60 p-5">
                        <Quote className="mb-2 size-5 text-primary" />
                        {r.comment ? <p className="leading-relaxed">{r.comment}</p> : <p className="text-muted-foreground">Yorum yazmadan onayladı.</p>}
                        <p className="mt-3 text-sm">
                          <b>{r.approverName}</b>
                          <span className="text-muted-foreground">
                            {" "}
                            · {r.relation} · @{r.approverEmail.split("@")[1]}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{r.targetLabel}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            <Section
              title="Sertifikalar"
              action={
                own && (
                  <button onClick={onAddCert} className={btn("outline", "sm")}>
                    <Plus /> Sertifika ekle
                  </button>
                )
              }
              empty="Henüz sertifika eklenmedi."
            >
              {data.certs.length > 0 && (
                <ul className="divide-y">
                  {data.certs.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        {safeHref(c.link) ? (
                          <a href={safeHref(c.link)} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                            {c.name}
                          </a>
                        ) : (
                          <b className="font-semibold">{c.name}</b>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {c.provider} · {c.date}
                        </p>
                      </div>
                      <CertBadge status={c.status} pending={refFor("certificate", c.id)?.status === "Bekliyor"} onRequest={own ? () => onRequestRef?.(`crt:${c.id}`) : undefined} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {data.competitions.length > 0 && (
              <Section title="Yarışmalar">
                <ul className="divide-y">
                  {data.competitions.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <Link href={`/yarismalar/${c.id}`} className="font-semibold hover:underline">
                        {c.label}
                      </Link>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Trophy className="size-4" /> {c.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {data.credentials.length > 0 && (
              <Section title="TLTpulse sertifikaları">
                <ul className="divide-y">
                  {data.credentials.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex items-center gap-2 font-semibold">
                        <Award className="size-4 text-primary" /> {c.title}
                      </span>
                      {c.status === "Gönderildi" && safeHref(c.url) ? (
                        <a href={safeHref(c.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                          Görüntüle <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <Pill tone="muted">
                          <Clock className="size-3" /> Beklemede
                        </Pill>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Eğitim" empty="Henüz eğitim eklenmedi.">
              {data.education.length > 0 && (
                <ul className="grid gap-3">
                  {data.education.map((e, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-muted">
                        <GraduationCap className="size-5" />
                      </span>
                      <div>
                        <b className="font-semibold">{e.school}</b>
                        <p className="text-sm text-muted-foreground">
                          {e.department}
                          {e.start && ` · ${e.start} – ${e.end}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside className="grid content-start gap-6">
            <div className="rounded-3xl bg-navy p-6 text-on-navy">
              <p className="text-xs tracking-[0.08em] text-on-navy-muted uppercase">Sezon puanı</p>
              <p className="mt-3 text-6xl leading-none font-semibold text-cyan tabular-nums">{data.score}</p>
              <p className="mt-1 text-xs text-on-navy-muted">Tüm zamanlar: {data.total}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-lav px-3 py-1 text-xs font-semibold text-secondary-foreground">{levelLabel(data.level)}</span>
                {data.rank.rank > 0 && (
                  <span className="text-on-navy-muted">
                    {data.rank.rank}. / {data.rank.of}
                  </span>
                )}
              </div>
              {data.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.badges.map((b) => (
                    <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full bg-cyan/15 px-3 py-1 text-xs font-semibold text-cyan">
                      {b.kind === "Sezon şampiyonu" ? <Crown className="size-3.5" /> : <HeartHandshake className="size-3.5" />} {b.label}
                    </span>
                  ))}
                </div>
              )}
              {own && (
                <Link href="/puan" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan hover:underline">
                  Puanım nereden geliyor? →
                </Link>
              )}
            </div>

            {sidebarTop}

            {own && <ReadmeBadge username={data.username} github={data.github} />}

            <Section title="Beceriler" empty="Henüz beceri eklenmedi.">
              {data.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((s) => (
                    <span
                      key={s.name}
                      title={s.proof === "Beyan" ? "Kanıtı yok" : `Kanıt: ${s.proof}`}
                      className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm", s.proof === "Beyan" ? "border text-muted-foreground" : "bg-secondary font-medium text-secondary-foreground")}
                    >
                      {s.proof !== "Beyan" && <Check className="size-3.5" />}
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <Section title="İlgi alanları" empty="Henüz eklenmedi.">
              {data.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.interests.map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Bağlantılar"
              action={
                data.connections.length > 0 &&
                (own ? (
                  <Link href="/baglantilar" className="text-sm font-semibold text-primary hover:underline">
                    Tümü →
                  </Link>
                ) : (
                  <button onClick={() => setShowConnections(true)} className="text-sm font-semibold text-primary hover:underline">
                    Tümü →
                  </button>
                ))
              }
              empty="Henüz bağlantı yok."
            >
              {data.connections.length > 0 && (
                <ul className="grid gap-3">
                  {data.connections.slice(0, 6).map((c) => (
                    <li key={c.username}>
                      <Link href={`/u/${c.username}`} className="flex items-center gap-3 rounded-2xl p-1 hover:bg-muted">
                        <UserAvatar name={c.name} />
                        <span className="text-sm">
                          <b className="block font-semibold">{c.name}</b>
                          <span className="text-muted-foreground">{c.field}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>
        </div>
      </div>
      <Modal open={showConnections} onOpenChange={setShowConnections} title={`${data.name} · bağlantılar`} description={`${data.connections.length} bağlantı`}>
        <ul className="grid max-h-[60vh] gap-2 overflow-y-auto">
          {data.connections.map((c) => (
            <li key={c.username}>
              <Link href={`/u/${c.username}`} onClick={() => setShowConnections(false)} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-muted">
                <UserAvatar name={c.name} />
                <span className="text-sm">
                  <b className="block font-semibold">{c.name}</b>
                  <span className="text-muted-foreground">{c.field}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

/** GitHub README'ye eklenecek canlı rozet (lig + sezon puanı). */
function ReadmeBadge({ username, github }: { username: string; github: string }) {
  const site = useIsClient() ? window.location.origin : "";
  const md = `[![TLTpulse](${site}/rozet/${username})](${site}/u/${username})`;
  const copy = async (quiet = false) => {
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Markdown kopyalandı", { description: quiet ? "GitHub'da README.md'yi düzenle ve yapıştır." : "GitHub profilindeki README.md'ye yapıştır." });
    } catch {
      if (!quiet) toast.error("Kopyalanamadı");
    }
  };
  return (
    <Card>
      <h2 className="font-semibold">README rozeti</h2>
      <p className="mt-1 text-sm text-muted-foreground">GitHub profiline ekle; ligin ve sezon puanın canlı görünsün.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/rozet/${username}`} alt="TLTpulse rozeti" className="mt-3 h-5" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => copy()} className={btn("outline", "sm")}>
          <Copy /> Markdown&apos;ı kopyala
        </button>
        {github && (
          // GitHub'da profil README'si, kullanıcı adıyla aynı adlı repodaki README.md. Tıklayınca Markdown da kopyalanır.
          <a href={`https://github.com/${encodeURIComponent(github)}/${encodeURIComponent(github)}`} target="_blank" rel="noreferrer" onClick={() => copy(true)} className={btn("primary", "sm")}>
            <GitBranch /> GitHub README&apos;ye git <ExternalLink />
          </a>
        )}
      </div>
      {github && (
        <p className="mt-2 text-xs text-muted-foreground">
          Repo açılmıyorsa GitHub&apos;da <b>{github}</b> adında herkese açık bir repo oluştur; README.md&apos;si profilinde görünür.
        </p>
      )}
    </Card>
  );
}

export type ConnectionState = "none" | "outgoing" | "incoming" | "connected";

export function ProfileActionsOther({
  username,
  connection,
  blocked,
  onConnect,
  onAnswer,
  onCancel,
  onMessage,
  onBlock,
  onReport,
}: {
  username: string;
  connection: ConnectionState;
  blocked?: boolean;
  onConnect: () => void;
  onAnswer: (accept: boolean) => void;
  onCancel: () => void;
  onMessage: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}) {
  return (
    <>
      <button onClick={onMessage} className={btn("primary")}>
        <MessageSquare /> Mesaj gönder
      </button>
      {connection === "connected" ? (
        <Link href="/baglantilar" className={btn("outline")}>
          <Check /> Bağlantın
        </Link>
      ) : connection === "outgoing" ? (
        <button onClick={onCancel} className={btn("outline")} title="İsteği geri çek">
          <Clock /> İstek gönderildi
        </button>
      ) : connection === "incoming" ? (
        <>
          <button onClick={() => onAnswer(true)} className={btn("lav")}>
            <Check /> İsteği kabul et
          </button>
          <button onClick={() => onAnswer(false)} className={btn("ghost")}>
            <X /> Reddet
          </button>
        </>
      ) : (
        <button onClick={onConnect} className={btn("outline")}>
          <UserPlus /> Bağlantı kur
        </button>
      )}
      <Link href={`/u/${username}/cv`} className={btn("ghost")}>
        CV <ExternalLink />
      </Link>
      {(onBlock || onReport) && (
        <DropdownMenu>
          <DropdownMenuTrigger className={btn("ghost", "md", "px-3")} aria-label="Diğer işlemler">
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1">
            {onReport && (
              <DropdownMenuItem onClick={onReport}>
                <Flag /> Şikayet et
              </DropdownMenuItem>
            )}
            {onBlock && (
              <DropdownMenuItem variant="destructive" onClick={onBlock}>
                <ShieldOff /> {blocked ? "Engeli kaldır" : "Engelle"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

/** Kaynaktan doğrulandı / kişi onayladı / beyan (kendi profilinde "Onay iste"). */
function CertBadge({ status, pending, onRequest }: { status: Certificate["status"]; pending: boolean; onRequest?: () => void }) {
  if (status === "Doğrulandı") return <Pill tone="ok">✓ Doğrulandı</Pill>;
  if (status === "Onaylandı")
    return (
      <Pill tone="ok">
        <BadgeCheck className="size-3.5" /> Onaylı
      </Pill>
    );
  if (status === "İsim uyuşmuyor") return <Pill tone="warn">İsim uyuşmuyor</Pill>;
  if (pending)
    return (
      <Pill tone="warn">
        <Clock className="size-3.5" /> Onay bekliyor
      </Pill>
    );
  return onRequest ? (
    <button onClick={onRequest} className={btn("lav", "sm", "shrink-0")}>
      Onay iste
    </button>
  ) : (
    <Pill tone="muted">Beyan</Pill>
  );
}
