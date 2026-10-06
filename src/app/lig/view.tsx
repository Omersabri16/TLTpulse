"use client";

import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsDown, ChevronsUp, Crown, Lock, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { UserAvatar } from "@/components/brand";
import { Modal } from "@/components/modal";
import { Container, PageHero, Segmented } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { MIN_SEASON_POINTS, promotionCount, relegationCount, type LeagueRow } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { Level, SeasonInfo } from "@/lib/types";
import { daysLeft } from "@/lib/time";
import { cn } from "@/lib/utils";

function Line({ kind, level }: { kind: "up" | "down"; level: Level }) {
  const up = kind === "up";
  return (
    <li aria-hidden className={cn("flex items-center gap-3 px-4 py-2 text-xs font-semibold sm:px-6", up ? "bg-ok-bg text-ok" : "bg-destructive/10 text-destructive")}>
      {up ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
      {up
        ? level === "Kıdemli"
          ? `Sezon şampiyonları: ilk %20 (en az ${MIN_SEASON_POINTS} puan)`
          : `Yükselme çizgisi: ilk %20 (en az ${MIN_SEASON_POINTS} puan) sezon sonunda üst lige çıkar`
        : `Düşme çizgisi: son %10 (${MIN_SEASON_POINTS} puanın altında) bir alt lige düşer`}
    </li>
  );
}

export function League({ all, season }: { all: LeagueRow[]; season: SeasonInfo | null }) {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const score = useMyScore();
  const router = useRouter();
  const member = !!session && !!profile;

  const [levelChoice, setLevel] = useState<Level | null>(null);
  // Seçim yapılana kadar giriş yapan kendi liginde, misafir Yeni başlayan liginde başlar.
  const level = levelChoice ?? (member ? score.level : "Yeni başlayan");
  const [q, setQ] = useState("");
  const [gate, setGate] = useState(false);

  // Sıra arama süzmesinden önce hesaplanır; çizgiler sıraya göre çizilir.
  const { rows, upAfter, downFrom } = useMemo(() => {
    const mine = member && profile ? profile.username : "";
    const ranked = all
      .filter((r) => r.league === level)
      .map((r) => (r.username === mine ? { ...r, me: true } : r))
      .map((r, i) => ({ ...r, rank: i + 1 }));
    const n = ranked.length;
    const up = ranked.filter((r, i) => i < promotionCount(n) && r.score >= MIN_SEASON_POINTS).length;
    let down = -1;
    if (level !== "Yeni başlayan" && relegationCount(n) > 0) {
      const i = ranked.findIndex((r, j) => j >= Math.max(up, n - relegationCount(n)) && r.score < MIN_SEASON_POINTS);
      down = i;
    }
    const t = q.toLocaleLowerCase("tr");
    return { rows: ranked.filter((r) => !t || r.name.toLocaleLowerCase("tr").includes(t)), upAfter: up, downFrom: down };
  }, [all, member, profile, level, q]);

  const open = (username: string, me?: boolean) => {
    if (!member) return setGate(true);
    router.push(me ? "/profil" : `/u/${username}`);
  };
  const left = season ? daysLeft(season.endsAt) : null;
  const filtered = !!q;

  return (
    <>
      <PageHero
        eyebrow="Ürettikçe yüksel"
        title="Yeteneğin"
        highlight="liginde."
        subtitle="Herkes Yeni başlayan liginde başlar. Lig puanı sadece bu sezon kazandığın puandır."
        right={
          <div className="grid gap-1 text-left text-sm text-on-navy-muted sm:text-right">
            <span className="inline-flex items-center gap-2 sm:justify-end">
              <Trophy className="size-5 text-cyan" /> {season?.name ?? "Sezon"}
            </span>
            {left !== null && (
              <span>
                Bitmesine <b className="text-2xl text-on-navy tabular-nums">{left}</b> gün
              </span>
            )}
            {member && (
              <span>
                Sen: {score.level} · {score.season} puan · {score.rank.rank}. sıra
              </span>
            )}
          </div>
        }
      />
      <Container>
        {!member && (
          <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-primary/30 bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-sm text-secondary-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" />
              Ligi herkes görebilir. Kendi sıranı görmek, profillere bakmak ve yarışmalara katılmak için giriş yap.
            </p>
            <div className="flex shrink-0 gap-2">
              <Link href="/giris?next=/lig" className={btn("primary", "sm")}>
                Giriş yap
              </Link>
              <Link href="/kayit" className={btn("outline", "sm")}>
                Kayıt ol
              </Link>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={level}
            onChange={setLevel}
            options={[
              { value: "Yeni başlayan", label: "Yeni başlayan" },
              { value: "Orta", label: "Orta" },
              { value: "Kıdemli", label: "Kıdemli" },
            ]}
          />
          <div className="relative sm:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className={cn(inputClass, "rounded-full pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yazılımcı ara" />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="hidden grid-cols-[64px_1fr_140px_40px] gap-4 border-b px-6 py-4 text-xs text-muted-foreground sm:grid">
            <span>Sıra</span>
            <span>Yazılımcı</span>
            <span>Sezon puanı</span>
            <span />
          </div>
          {rows.length === 0 && <p className="px-6 py-10 text-sm text-muted-foreground">{q ? "Bu aramayla eşleşen yok." : "Bu ligde henüz kimse yok."}</p>}
          <ul>
            {rows.map((r) => (
              <Fragment key={r.username}>
                {!filtered && downFrom >= 0 && r.rank === downFrom + 1 && <Line kind="down" level={level} />}
                <li>
                  <button
                    onClick={() => open(r.username, r.me)}
                    className={cn(
                      "grid w-full grid-cols-[40px_1fr_auto] items-center gap-4 border-b px-4 py-4 text-left text-sm transition last:border-b-0 hover:bg-muted/60 sm:grid-cols-[64px_1fr_140px_40px] sm:px-6",
                      r.me && "bg-secondary hover:bg-secondary",
                    )}
                  >
                    <span className="text-lg tabular-nums">
                      {String(r.rank).padStart(2, "0")}
                      {r.rank === 1 && (level === "Kıdemli" ? <Crown className="ml-1 inline size-4 text-cyan-ink" /> : <Trophy className="ml-1 inline size-4 text-cyan-ink" />)}
                    </span>
                    <span className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={r.name} className="size-11" />
                      <span className="min-w-0">
                        <b className="font-semibold">{r.name}</b>
                        {r.me && <span className="ml-2 text-xs text-muted-foreground">Sen</span>}
                        <span className="block truncate text-xs text-muted-foreground">{r.school}</span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <b className="text-xl font-semibold text-cyan-ink tabular-nums">{r.score}</b>
                      {r.trend > 0 ? <ArrowUp className="size-4 text-ok" /> : r.trend < 0 ? <ArrowDown className="size-4 text-destructive" /> : null}
                    </span>
                    <span className="hidden text-muted-foreground sm:block">{member ? <ArrowUpRight className="size-4" /> : <Lock className="size-4" />}</span>
                  </button>
                </li>
                {!filtered && upAfter > 0 && r.rank === upAfter && <Line kind="up" level={level} />}
              </Fragment>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Eşit puanda o puana önce ulaşan öne geçer. Sezon sonunda her ligin ilk %20&apos;si (en az {MIN_SEASON_POINTS} puanla) bir üst lige çıkar; Orta ve Kıdemli&apos;nin son
          %10&apos;u ({MIN_SEASON_POINTS} puanın altındaysa) düşer.
        </p>
      </Container>

      <Modal open={gate} onOpenChange={setGate} title="Profilleri görmek için giriş yap" description="Ligi herkes görebilir; profillere bakmak, mesaj atmak ve yarışmalara katılmak için hesabın olmalı.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/giris?next=/lig" className={btn("primary", "lg", "flex-1")}>
            Giriş yap
          </Link>
          <Link href="/kayit" className={btn("outline", "lg", "flex-1")}>
            Kayıt ol
          </Link>
        </div>
      </Modal>
    </>
  );
}
