"use client";

import { Award, FolderGit2, Map, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Card, Container, PageHero, PageShell } from "@/components/page-shell";
import { Progress } from "@/components/ui/progress";
import { btn } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import { levelLabel } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { ScoreSource } from "@/lib/types";

const INFO: Record<ScoreSource, { icon: typeof Award; rule: string; action: { label: string; href: string } }> = {
  Projeler: { icon: FolderGit2, rule: "Her proje zorluğuna (kolay 2, orta 4, zor 6) ve kalitesine (test, CI, README, demo, commit geçmişi: 2–4) göre puan alır.", action: { label: "Proje ekle", href: "/projeler?ekle=1" } },
  Yarışmalar: { icon: Trophy, rule: "Tamamlanan her yarışma 4 puan; ilk üçe giren takımlar ayrıca 8, 6 ya da 4 puan alır.", action: { label: "Yarışmalar", href: "/yarismalar" } },
  "Akran puanı": { icon: Users, rule: "Yarışma bitince takım arkadaşların seni 1–5 arası puanlar. Ortalaman 15 üzerinden hesaplanır.", action: { label: "Yarışmalar", href: "/yarismalar" } },
  Sertifikalar: { icon: Award, rule: "Resmi kaynaktan doğrulanan sertifika 3–4 puan, doğrulanamayan 1 puan alır.", action: { label: "Sertifika ekle", href: "/profil?sertifika=1" } },
  Referanslar: { icon: ShieldCheck, rule: "Amirin ya da hocan onaylarsa: kurumsal e-posta 5, kişisel e-posta 2 puan; yorum yazarsa +1.", action: { label: "Onay iste", href: "/profil?onay=1" } },
  "Yol haritası": { icon: Map, rule: "AI yol haritandaki adımları tamamladıkça 1–2 puan kazanırsın.", action: { label: "Yol haritam", href: "/yol-haritasi" } },
};

function Score() {
  const score = useMyScore();
  const history = useApp((s) => s.history);
  const roadmap = useApp((s) => s.roadmap);
  const done = roadmap?.steps.filter((s) => score.roadmapDone.includes(s.id)) ?? [];
  const events = [
    ...history,
    ...done.map((s) => ({ id: `rm-${s.id}`, at: roadmap!.generatedAt, source: "Yol haritası" as const, label: s.title, points: s.points })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageHero
        eyebrow="Puanım"
        title="Puanın nereden"
        highlight="geliyor?"
        subtitle="Hepsi kural tabanlı. Aynı iş her zaman aynı puanı alır; AI puan vermez."
        right={
          <div className="text-left sm:text-right">
            <p className="text-6xl leading-none font-semibold text-cyan tabular-nums">
              {score.total}
              <span className="ml-1 text-base font-normal text-on-navy">/100</span>
            </p>
            <span className="mt-3 inline-block rounded-full bg-lav px-3 py-1 text-xs font-semibold text-secondary-foreground">{levelLabel(score.level)}</span>
          </div>
        }
      />
      <Container className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          {score.parts.map((p) => {
            const info = INFO[p.source];
            const Icon = info.icon;
            return (
              <Card key={p.source} className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-semibold">{p.source}</h2>
                      <span className="text-sm tabular-nums">
                        <b className="text-lg">{p.points}</b>
                        <span className="text-muted-foreground"> / {p.max}</span>
                      </span>
                    </div>
                    <Progress value={(p.points / p.max) * 100} className="mt-2" />
                    <p className="mt-2 text-sm text-muted-foreground">{info.rule}</p>
                  </div>
                  <Link href={info.action.href} className={btn("outline", "sm", "self-start sm:self-center")}>
                    {info.action.label}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Puan geçmişi</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz puan almadın. İlk projeni ekleyerek başla.</p>
          ) : (
            <ul className="divide-y">
              {events.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.source} · {fmtDate(e.at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok">+{e.points}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Her kaynağın bir üst sınırı var; sınırı aşan puan toplama eklenmez. Toplam en fazla 100.</p>
        </Card>
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Score />
    </PageShell>
  );
}
