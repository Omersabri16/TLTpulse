"use client";

import { Award, FolderGit2, Map, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, Container, PageHero, PageShell, Segmented } from "@/components/page-shell";
import { Progress } from "@/components/ui/progress";
import { btn } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import { daysLeft } from "@/lib/time";
import { levelLabel } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { ScoreSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const INFO: Record<ScoreSource, { icon: typeof Award; rule: string; action: { label: string; href: string } }> = {
  Projeler: {
    icon: FolderGit2,
    rule: "100 üzerinden. AI kodu okuyup zorluğu sınıflandırır (Kolay 10, Orta 40, Zor 70); kalite en fazla 30: CI'da yeşil testler 12, açılan demo 8, anlamlı README 4, 10+ günde geliştirme 6. Kopya ve şablon kod puan almaz.",
    action: { label: "Proje ekle", href: "/projeler?ekle=1" },
  },
  Yarışmalar: { icon: Trophy, rule: "Zorluğa göre en fazla Kolay 100, Orta 150, Zor 200. Takım şartnamenin ne kadarını karşıladıysa o kadar puan; %50'nin altı 0.", action: { label: "Yarışmalar", href: "/yarismalar" } },
  "Akran puanı": { icon: Users, rule: "Yarışma bitince takım arkadaşların seni 1–5 yıldızla puanlar; her yarışmada ortalaman 30 üzerinden. Takımındaki yeni başlayanlardan 4+ yıldız alırsan +15 mentor puanı.", action: { label: "Yarışmalar", href: "/yarismalar" } },
  Sertifikalar: { icon: Award, rule: "Kaynaktan doğrulanan BTK Akademi ve Credly 20; diğerleri beyan 5, hocan ya da amirin onaylarsa 20; isim uyuşmayan 0.", action: { label: "Sertifika ekle", href: "/profil?sertifika=1" } },
  Referanslar: { icon: ShieldCheck, rule: "Amirin ya da hocan onaylarsa: kurumsal e-posta 30, kişisel e-posta 10; yorum yazarsa +5.", action: { label: "Onay iste", href: "/profil?onay=1" } },
  "Yol haritası": { icon: Map, rule: "AI yol haritandaki adımları tamamladıkça adım başına 5–10 puan.", action: { label: "Yol haritam", href: "/yol-haritasi" } },
};

function Score() {
  const score = useMyScore();
  const history = useApp((s) => s.history);
  const season = useApp((s) => s.season);
  const [view, setView] = useState<"sezon" | "tum">("sezon");
  const parts = view === "sezon" ? score.parts : score.allParts;
  const sum = view === "sezon" ? score.season : score.total;
  const events = view === "sezon" && season ? history.filter((e) => e.seasonId === season.id) : history;
  const left = season ? daysLeft(season.endsAt) : 0;

  return (
    <>
      <PageHero
        eyebrow="Puanım"
        title="Puanın nereden"
        highlight="geliyor?"
        subtitle="Hepsi kural tabanlı. AI sadece proje zorluğunu sınıflandırır; puanı kural tablosu verir."
        right={
          <div className="text-left sm:text-right">
            <p className="text-6xl leading-none font-semibold text-cyan tabular-nums">{score.season}</p>
            <span className="mt-1 block text-xs text-on-navy-muted">
              {season?.name ?? "Sezon"} puanı · tüm zamanlar {score.total}
            </span>
            <span className="mt-3 inline-block rounded-full bg-lav px-3 py-1 text-xs font-semibold text-secondary-foreground">{levelLabel(score.level)}</span>
            {season && <span className="mt-2 block text-xs text-on-navy-muted">Sezonun bitmesine {left} gün</span>}
          </div>
        }
      />
      <Container className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "sezon", label: "Bu sezon" },
                { value: "tum", label: "Tüm zamanlar" },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              {view === "sezon" ? "Lig sıran sadece bu sezonun puanıyla belirlenir." : "Kanıtların kalıcı; sadece lig puanı her sezon sıfırlanır."}
            </p>
          </div>
          {parts.map((p) => {
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
                        <span className="text-muted-foreground"> puan</span>
                      </span>
                    </div>
                    <Progress value={sum > 0 ? Math.max(0, (p.points / sum) * 100) : 0} className="mt-2" />
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
            <p className="text-sm text-muted-foreground">{view === "sezon" ? "Bu sezon henüz puan almadın. İlk projeni ekleyerek başla." : "Henüz puan almadın. İlk projeni ekleyerek başla."}</p>
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
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", e.points >= 0 ? "bg-ok-bg text-ok" : "bg-destructive/10 text-destructive")}>
                    {e.points >= 0 ? "+" : ""}
                    {e.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
            Puan, kanıt eklendiği ya da değiştiği sezona yazılır. Yeniden analizde ya da kaldırmada fark (+/−) o anki sezona yazılır. Üst sınır yok.
          </p>
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
