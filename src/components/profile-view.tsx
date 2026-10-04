"use client";

import { BadgeCheck, Check, Clock, ExternalLink, GitBranch, GraduationCap, MapPin, MessageSquare, Plus, Quote, Trophy, UserPlus, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PulseLine, UserAvatar } from "@/components/brand";
import { Card, Pill } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { levelLabel } from "@/lib/score";
import type { Certificate, Difficulty, Education, Experience, Level, Quality, Reference, Skill } from "@/lib/types";
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
  score: number;
  level: Level;
  rank: { rank: number; of: number };
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
}: {
  data: ProfileData;
  own: boolean;
  actions: ReactNode;
  sidebarTop?: ReactNode;
  onAddCert?: () => void;
  onRequestRef?: (preset?: string) => void;
  onAddProject?: () => void;
}) {
  const approved = data.references.filter((r) => r.status === "Onaylandı");
  const refFor = (type: "experience" | "project", id: string) => data.references.find((r) => r.targetType === type && r.targetId === id);

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
                  <span>{data.connections.length} bağlantı</span>
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
                        <a href={c.link} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                          {c.name}
                        </a>
                        <p className="text-sm text-muted-foreground">
                          {c.provider} · {c.date}
                        </p>
                      </div>
                      <Pill tone={c.status === "Doğrulandı" ? "ok" : c.status === "İsim uyuşmuyor" ? "warn" : "muted"}>
                        {c.status === "Doğrulandı" ? "✓ Doğrulandı" : c.status === "Doğrulanamadı" ? "Beyan" : c.status}
                      </Pill>
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
              <p className="text-xs tracking-[0.08em] text-on-navy-muted uppercase">Lig puanı</p>
              <p className="mt-3 text-6xl leading-none font-semibold text-cyan tabular-nums">
                {data.score}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-lav px-3 py-1 text-xs font-semibold text-secondary-foreground">{levelLabel(data.level)}</span>
                {data.rank.rank > 0 && (
                  <span className="text-on-navy-muted">
                    {data.rank.rank}. sıra · {data.field || "Tüm alanlar"}
                  </span>
                )}
              </div>
              {own && (
                <Link href="/puan" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan hover:underline">
                  Puanım nereden geliyor? →
                </Link>
              )}
            </div>

            {sidebarTop}

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

            <Section title="Bağlantılar" empty="Henüz bağlantı yok. Takım arkadaşların burada görünür.">
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
    </>
  );
}

export function ProfileActionsOther({ username, connected, onConnect, onMessage }: { username: string; connected: boolean; onConnect: () => void; onMessage: () => void }) {
  return (
    <>
      <button onClick={onMessage} className={btn("primary")}>
        <MessageSquare /> Mesaj gönder
      </button>
      <button onClick={onConnect} className={btn("outline")} disabled={connected}>
        {connected ? (
          <>
            <Check /> Bağlantın
          </>
        ) : (
          <>
            <UserPlus /> Bağlantı kur
          </>
        )}
      </button>
      <Link href={`/u/${username}/cv`} className={btn("ghost")}>
        CV <ExternalLink />
      </Link>
    </>
  );
}
