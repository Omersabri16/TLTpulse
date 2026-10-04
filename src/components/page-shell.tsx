"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Assistant } from "@/components/assistant";
import { Logo } from "@/components/brand";
import { SiteHeader } from "@/components/site-header";
import { useApp, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Koyu lacivert sayfa başlık bandı. `highlight` başlığın kesikli çerçeveli kelimesi. */
export function PageHero({
  eyebrow,
  title,
  highlight,
  subtitle,
  right,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  highlight?: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-navy text-on-navy">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-12 sm:pb-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && <p className="mb-5 text-[11px] font-medium tracking-[0.08em] text-on-navy-muted uppercase">{eyebrow}</p>}
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-[52px]">
              {title}
              {highlight && (
                <>
                  {" "}
                  <span className="hl">{highlight}</span>
                </>
              )}
            </h1>
            {subtitle && <p className="mt-4 max-w-xl text-sm text-on-navy-muted sm:text-[15px]">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo className="text-lg text-foreground" />
        <span>Yetenek, ürettikçe görünür.</span>
        <span>© 2026 TLTpulse</span>
        <span>RHINOTRON8</span>
      </div>
    </footer>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10", className)}>{children}</div>;
}

/** Üst menü + içerik + alt bilgi. `auth` verilirse oturum yoksa girişe yönlendirir. */
export function PageShell({ children, auth = false }: { children: ReactNode; auth?: boolean }) {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const router = useRouter();
  const pathname = usePathname();
  const blocked = auth && hydrated && !session;

  useEffect(() => {
    if (blocked) router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
  }, [blocked, router, pathname]);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        {auth && (!hydrated || !session) ? (
          <div className="grid flex-1 place-items-center py-32 text-sm text-muted-foreground">Yükleniyor…</div>
        ) : (
          children
        )}
      </main>
      <SiteFooter />
      {hydrated && session && <Assistant />}
    </>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border bg-card p-6 text-card-foreground", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "ok" | "lav" | "warn" | "muted" | "danger"; className?: string }) {
  const tones = {
    default: "border bg-card text-foreground",
    ok: "bg-ok-bg text-ok",
    lav: "bg-secondary text-secondary-foreground",
    warn: "bg-warn-bg text-warn",
    muted: "bg-muted text-muted-foreground",
    danger: "bg-destructive/10 text-destructive",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-full border bg-card p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-2 text-sm whitespace-nowrap transition",
            value === o.value ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
