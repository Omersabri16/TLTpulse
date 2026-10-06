"use client";

import { toast } from "sonner";
import { MIN_SEASON_POINTS, promotionCount } from "./score";
import type { MeData, MeScore } from "./types";

function burst(big = true) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  import("canvas-confetti").then(({ default: confetti }) =>
    confetti({ particleCount: big ? 160 : 80, spread: big ? 90 : 60, origin: { y: 0.7 }, colors: ["#1aa7ec", "#5249d0", "#e4e1fb", "#3ddc97"] }),
  );
}

const aboveLine = (s: MeScore) => s.level !== "Kıdemli" && s.season >= MIN_SEASON_POINTS && s.rank.rank > 0 && s.rank.rank <= promotionCount(s.rank.of);

/** Puan artınca yükselme çizgisinin üstüne çıktıysa küçük bir "patlama". Çıkmadıysa false. */
export function celebrateIfAboveLine(before: MeScore, after: MeScore) {
  if (aboveLine(before) || !aboveLine(after)) return false;
  burst(false);
  toast.success("Yükselme çizgisinin üstündesin!", { description: `Sezon sonunda böyle kalırsan ${after.level === "Yeni başlayan" ? "Orta" : "Kıdemli"} lige çıkarsın.` });
  return true;
}

/** Sezon kapandıktan sonraki ilk girişte: lige yükseldiyse ya da şampiyon olduysa konfeti (TLT = patlama anı). */
export function celebrateSeason(r: NonNullable<MeData["seasonResult"]>, onShare: () => void) {
  const up = (r.from === "Yeni başlayan" && r.to !== "Yeni başlayan") || (r.from === "Orta" && r.to === "Kıdemli");
  if (r.champion) {
    burst();
    toast.success(`${r.seasonName} şampiyonusun!`, { description: "Kıdemli ligin ilk %20'sindesin. Rozetin profilinde.", action: { label: "Paylaş", onClick: onShare }, duration: 12000 });
  } else if (up) {
    burst();
    toast.success(`${r.to} lige yükseldin!`, { description: `${r.seasonName} bitti; yeni sezonda ${r.to} ligindesin.`, action: { label: "Paylaş", onClick: onShare }, duration: 12000 });
  } else if (r.to !== r.from) {
    toast(`${r.seasonName} bitti: ${r.to} ligindesin.`, { description: "Yeni sezonda puanın sıfırdan başladı; tekrar yükselebilirsin." });
  }
}
