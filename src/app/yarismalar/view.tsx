"use client";

import { useState } from "react";
import { CompetitionCard } from "@/components/competition-card";
import { Container, PageHero, Segmented } from "@/components/page-shell";
import type { Competition, CompetitionStatus } from "@/lib/types";

export function Competitions({ all }: { all: Competition[] }) {
  const [filter, setFilter] = useState<"" | CompetitionStatus>("");
  const list = all.filter((c) => !filter || c.status === filter);
  return (
    <>
      <PageHero eyebrow="Birlikte daha ileri" title="Fikirden" highlight="üretime." subtitle="Bir pozisyon seç. Yeni bir takımla, gerçek bir işe imza at." />
      <Container>
        <Segmented
          className="mb-6"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "", label: "Tümü" },
            { value: "Başvurular açık", label: "Başvurular açık" },
            { value: "Devam ediyor", label: "Devam ediyor" },
            { value: "Tamamlandı", label: "Tamamlandı" },
          ]}
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CompetitionCard key={c.id} c={c} />
          ))}
        </div>
      </Container>
    </>
  );
}
