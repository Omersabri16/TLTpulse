"use client";

import { ArrowUpRight, Check, Code2, Gauge } from "lucide-react";
import Link from "next/link";
import { btn } from "@/lib/btn";
import { fmtDate, teamOf } from "@/lib/competitions";
import { useApp } from "@/lib/store";
import type { Competition, CompetitionStatus, Difficulty } from "@/lib/types";
import { cn } from "@/lib/utils";

const CTA: Record<CompetitionStatus, string> = {
  Taslak: "Detayları gör",
  Sırada: "Detayları gör",
  "Başvurular açık": "Detayları gör",
  "Devam ediyor": "Yarışmayı keşfet",
  Değerlendiriliyor: "Yarışmayı keşfet",
  Tamamlandı: "Karneleri gör",
  İptal: "Detayları gör",
};

export const DIFF_CLASS: Record<Difficulty, string> = {
  Kolay: "bg-ok-bg text-ok",
  Orta: "bg-secondary text-secondary-foreground",
  Zor: "bg-cyan text-navy",
};

export function DifficultyBadge({ c, className }: { c: Pick<Competition, "difficulty" | "maxPoints">; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", DIFF_CLASS[c.difficulty], className)}>
      <Gauge className="size-3.5" /> {c.difficulty} · en fazla {c.maxPoints} puan
    </span>
  );
}

export function CompetitionCard({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const applied = useApp((s) => s.applications[c.id]);
  const mine = teamOf(c, username);
  const myPoints = mine?.members.find((m) => m.username === username)?.points;
  return (
    <article className="flex min-h-[380px] flex-col rounded-3xl bg-navy p-6 text-on-navy">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold">{c.code}</span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs",
            c.status === "Başvurular açık" ? "border border-cyan text-cyan" : c.status === "İptal" ? "bg-destructive/20 text-on-navy" : c.status === "Tamamlandı" ? "bg-navy-2 text-on-navy-muted" : "bg-navy-2 text-on-navy",
          )}
        >
          {c.status === "Başvurular açık" && <Check className="mr-1 inline size-3" />}
          {c.status}
        </span>
      </div>
      <h2 className="mt-8 text-3xl leading-tight font-semibold tracking-tight">{c.title}</h2>
      <p className="mt-2 text-sm text-on-navy-muted">{c.tagline}</p>
      <DifficultyBadge c={c} className="mt-4 w-fit" />
      {(applied || mine) && (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan/15 px-3 py-1 text-xs font-medium text-cyan">
          <Check className="size-3" /> {mine ? `Takımın: ${mine.name}${myPoints !== undefined ? ` · +${myPoints}` : ""}` : `Başvurdun: ${applied}`}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-6 pb-5">
        {c.positions.map((p) => (
          <span key={p.field} className="inline-flex items-center gap-1 rounded-full border border-navy-line px-2.5 py-1 text-xs">
            <Code2 className="size-3" /> {p.field}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-navy-line pt-5">
        <div className="text-xs text-on-navy-muted">
          {c.status === "Başvurular açık" ? "Son başvuru" : c.status === "Devam ediyor" ? "Teslim" : "Bitti"}
          <b className="mt-0.5 block text-sm text-on-navy">{fmtDate(c.status === "Başvurular açık" ? c.applyDeadline : c.end)}</b>
        </div>
        <Link href={`/yarismalar/${c.id}`} className={btn("onNavy", "md", "border-on-navy")}>
          {CTA[c.status]} <ArrowUpRight />
        </Link>
      </div>
    </article>
  );
}
