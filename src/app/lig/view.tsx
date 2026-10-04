"use client";

import { ArrowDown, ArrowUp, ArrowUpRight, Lock, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/brand";
import { Modal } from "@/components/modal";
import { Container, PageHero, Segmented } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { levelOf, type LeagueRow } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { Level } from "@/lib/types";
import { cn } from "@/lib/utils";

export function League({ all }: { all: LeagueRow[] }) {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const score = useMyScore();
  const router = useRouter();
  const member = !!session && !!profile;

  const [levelChoice, setLevel] = useState<Level | null>(null);
  // Seçim yapılana kadar giriş yapan kendi liginde, misafir Orta ligde başlar.
  const level = levelChoice ?? (member ? score.level : "Orta");
  const [q, setQ] = useState("");
  const [gate, setGate] = useState(false);

  const rows = useMemo(() => {
    const t = q.toLocaleLowerCase("tr");
    // Kendi satırında store'daki en güncel puan kullanılır.
    const mine = member && profile ? profile.username : "";
    return all
      .map((r) => (r.username === mine ? { ...r, score: score.total, me: true } : r))
      .sort((a, b) => b.score - a.score)
      .filter((r) => levelOf(r.score) === level)
      .filter((r) => !t || r.name.toLocaleLowerCase("tr").includes(t));
  }, [all, member, profile, score.total, level, q]);

  const open = (username: string, me?: boolean) => {
    if (!member) return setGate(true);
    router.push(me ? "/profil" : `/u/${username}`);
  };

  return (
    <>
      <PageHero
        eyebrow="Ürettikçe yüksel"
        title="Yeteneğin"
        highlight="liginde."
        subtitle="Aynı hedef, farklı yollar. Yerini yaptığın iş belirler."
        right={
          <span className="inline-flex items-center gap-2 text-sm text-on-navy-muted">
            <Trophy className="size-5 text-cyan" /> 2026 · Güz sezonu
          </span>
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
          <div className="hidden grid-cols-[64px_1fr_120px_40px] gap-4 border-b px-6 py-4 text-xs text-muted-foreground sm:grid">
            <span>Sıra</span>
            <span>Yazılımcı</span>
            <span>Lig puanı</span>
            <span />
          </div>
          {rows.length === 0 && <p className="px-6 py-10 text-sm text-muted-foreground">Bu filtrede kimse yok.</p>}
          <ul>
            {rows.map((r, i) => (
              <li key={r.username}>
                <button
                  onClick={() => open(r.username, r.me)}
                  className={cn(
                    "grid w-full grid-cols-[40px_1fr_auto] items-center gap-4 border-b px-4 py-4 text-left text-sm transition last:border-b-0 hover:bg-muted/60 sm:grid-cols-[64px_1fr_120px_40px] sm:px-6",
                    r.me && "bg-secondary hover:bg-secondary",
                  )}
                >
                  <span className="text-lg tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                    {i === 0 && <Trophy className="ml-1 inline size-4 text-cyan-ink" />}
                  </span>
                  <span className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={r.name} className="size-11" />
                    <span className="min-w-0">
                      <b className="font-semibold">{r.name}</b>
                      {r.me && <span className="ml-2 text-xs text-muted-foreground">Sen</span>}
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.school}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <b className="text-xl font-semibold text-cyan-ink tabular-nums">{r.score}</b>
                    {r.trend > 0 ? <ArrowUp className="size-4 text-ok" /> : r.trend < 0 ? <ArrowDown className="size-4 text-destructive" /> : null}
                  </span>
                  <span className="hidden text-muted-foreground sm:block">{member ? <ArrowUpRight className="size-4" /> : <Lock className="size-4" />}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
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


