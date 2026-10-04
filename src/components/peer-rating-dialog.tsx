"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/brand";
import { ratePeers } from "@/app/actions/competitions";
import { Modal } from "@/components/modal";
import { btn } from "@/lib/btn";
import { useAct, useApp } from "@/lib/store";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS = ["", "Zayıf", "İdare eder", "İyi", "Çok iyi", "Harika"];

export function PeerRatingDialog({ team, open, onOpenChange }: { team: Team; open: boolean; onOpenChange: (o: boolean) => void }) {
  const username = useApp((s) => s.session?.username);
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const mates = team.members.filter((m) => m.username !== username);
  const [stars, setStars] = useState<Record<string, number>>({});
  const ready = mates.every((m) => stars[m.username]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Takım arkadaşlarını puanla" description="Puanlar anonimdir. Her arkadaşının katkısını 1–5 arası değerlendir.">
      <ul className="grid gap-4">
        {mates.map((m) => (
          <li key={m.username} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3">
              <UserAvatar name={m.name} />
              <span className="text-sm">
                <b className="block font-semibold">{m.name}</b>
                <span className="text-muted-foreground">{m.field}</span>
              </span>
            </span>
            <span className="flex items-center gap-1" role="radiogroup" aria-label={`${m.name} puanı`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  role="radio"
                  aria-checked={stars[m.username] === n}
                  aria-label={`${n} yıldız`}
                  onClick={() => setStars({ ...stars, [m.username]: n })}
                  className="p-0.5"
                >
                  <Star className={cn("size-6", (stars[m.username] ?? 0) >= n ? "fill-cyan text-cyan" : "text-muted-foreground/40")} />
                </button>
              ))}
              <span className="ml-2 w-16 text-xs text-muted-foreground">{LABELS[stars[m.username] ?? 0]}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={() => onOpenChange(false)} className={btn("ghost")}>
          Vazgeç
        </button>
        <button
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await act(ratePeers({ teamId: team.id, ratings: stars }));
            setBusy(false);
            if (!ok) return;
            toast.success("Puanların kaydedildi", { description: "Teşekkürler, akran puanı herkes için daha adil olur." });
            onOpenChange(false);
          }}
          className={btn("primary")}
        >
          {busy ? "Gönderiliyor…" : "Gönder"}
        </button>
      </div>
    </Modal>
  );
}
