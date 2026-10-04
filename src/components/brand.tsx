import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { hash } from "@/lib/score";

export function PulseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 text-[22px] font-semibold tracking-tight text-on-navy", className)} aria-label="TLTpulse ana sayfa">
      <Image src="/logo-mark.png" alt="" width={169} height={108} priority className="h-9 w-auto shrink-0" />
      <span>
        TLTpulse<span className="text-cyan">.</span>
      </span>
    </Link>
  );
}

const AVATAR_TONES = [
  "bg-lav text-secondary-foreground",
  "bg-ok-bg text-ok",
  "bg-[#d4ecfb] text-[#0a6aa8] dark:bg-[#0f2f4a] dark:text-[#7fd3ff]",
  "bg-warn-bg text-warn",
];

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("tr"))
    .join("");

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold", AVATAR_TONES[hash(name) % AVATAR_TONES.length], className)}>
      {initials(name)}
    </span>
  );
}

/** Nabız çizgisi: her atış bir proje. Marka imzası. */
export function PulseLine({ beats, className, height = 120 }: { beats: number; className?: string; height?: number }) {
  const W = 1200;
  const M = height / 2 + 10;
  let d = `M0 ${M}`;
  const n = Math.max(0, beats);
  const gap = W / (n + 1);
  for (let i = 1; i <= n; i++) {
    const x = gap * i;
    const h = Math.min(M - 6, 28 + i * 7);
    d += ` L${x - 50} ${M} L${x - 30} ${M - 10} L${x - 18} ${M} L${x - 6} ${M + 16} L${x + 6} ${M - h} L${x + 20} ${M + 20} L${x + 32} ${M} L${x + 60} ${M - 7} L${x + 80} ${M}`;
  }
  d += ` L${W} ${M}`;
  return (
    <svg viewBox={`0 0 ${W} ${height + 20}`} preserveAspectRatio="none" className={cn("block w-full", className)} style={{ height }} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
