"use client";

import { toast } from "sonner";
import { levelOf } from "./score";

/** Lig atlanınca "patlama" (TLT) anı. */
export function celebrateIfLevelUp(before: number, after: number) {
  const a = levelOf(before);
  const b = levelOf(after);
  if (a === b || after < before) return false;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    import("canvas-confetti").then(({ default: confetti }) =>
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 }, colors: ["#1aa7ec", "#5249d0", "#e4e1fb", "#3ddc97"] }),
    );
  }
  toast.success(`${b === "Kıdemli" ? "Kıdemli" : "Orta"} lige yükseldin!`, { description: `Puanın ${before} → ${after}` });
  return true;
}
