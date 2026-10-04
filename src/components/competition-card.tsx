"use client";

import { ArrowUpRight, Check, Code2 } from "lucide-react";
import Link from "next/link";
import { btn } from "@/lib/btn";
import { fmtDate, teamOf } from "@/lib/competitions";
import { useApp } from "@/lib/store";
import type { Competition, CompetitionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CTA: Record<CompetitionStatus, string> = {
  "Başvurular açık": "Detayları gör",
  "Devam ediyor": "Yarışmayı keşfet",
  Tamamlandı: "Sonuçları gör",
};

export function CompetitionCard({ c }: { c: Competition }) {
  const username = useApp((s) => s.session?.username ?? "");
  const applied = useApp((s) => s.applications[c.id]);
  const mine = teamOf(c, username);
  return (
    <article className="flex min-h-[380px] flex-col rounded-3xl bg-navy p-6 text-on-navy">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold">
          {c.code}
          <span className="ml-2 text-[10px] font-normal tracking-wider text-on-navy-muted uppercase">/ {c.theme}</span>
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs",
            c.status === "Başvurular açık" ? "border border-cyan text-cyan" : c.status === "Devam ediyor" ? "bg-navy-2 text-on-navy" : "bg-navy-2 text-on-navy-muted",
          )}
        >
          {c.status === "Başvurular açık" && <Check className="mr-1 inline size-3" />}
          {c.status}
        </span>
      </div>
      <h2 className="mt-8 text-3xl leading-tight font-semibold tracking-tight">{c.title}</h2>
      <p className="mt-2 text-sm text-on-navy-muted">{c.tagline}</p>
      {(applied || mine) && (
        <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan/15 px-3 py-1 text-xs font-medium text-cyan">
          <Check className="size-3" /> {mine ? `Takımın: ${mine.name}` : `Başvurdun: ${applied}`}
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
