"use client";

import { useState } from "react";
import { CompetitionCard } from "@/components/competition-card";
import { Container, PageHero, Segmented } from "@/components/page-shell";
import type { Competition } from "@/lib/types";

type Filter = "" | "acik" | "devam" | "bitti";
const MATCH: Record<Exclude<Filter, "">, Competition["status"][]> = {
  acik: ["Başvurular açık"],
  devam: ["Devam ediyor", "Değerlendiriliyor"],
  bitti: ["Tamamlandı", "İptal"],
};

export function Competitions({ all }: { all: Competition[] }) {
  const [filter, setFilter] = useState<Filter>("");
  const list = all.filter((c) => !filter || MATCH[filter].includes(c.status));
  return (
    <>
      <PageHero
        eyebrow="Birlikte daha ileri"
        title="Fikirden"
        highlight="üretime."
        subtitle="Bir pozisyon seç, yeni bir takımla şartnameyi karşıla. Sıralama yok: ne kadar karşılarsan o kadar puan."
      />
      <Container>
        <Segmented
          className="mb-6"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "", label: "Tümü" },
            { value: "acik", label: "Başvurular açık" },
            { value: "devam", label: "Devam ediyor" },
            { value: "bitti", label: "Tamamlandı" },
          ]}
        />
        {list.length === 0 && <p className="text-sm text-muted-foreground">Bu filtrede yarışma yok.</p>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CompetitionCard key={c.id} c={c} />
          ))}
        </div>
      </Container>
    </>
  );
}
