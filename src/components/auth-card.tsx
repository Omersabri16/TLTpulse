"use client";

import type { ReactNode } from "react";
import { PulseLine } from "@/components/brand";
import { PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <PageShell>
      <section className="relative flex-1 bg-navy pb-16 text-on-navy">
        <PulseLine beats={4} className="absolute inset-x-0 top-24 text-navy-line" height={160} />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-12 sm:px-6 md:grid-cols-[1fr_440px] md:items-center md:pt-20">
          <div className="hidden md:block">
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight">{title}</h1>
            <p className="mt-5 max-w-sm text-on-navy-muted">{subtitle}</p>
          </div>
          <div className="rounded-3xl border bg-card p-6 text-card-foreground sm:p-8">
            <h1 className="mb-6 text-2xl font-semibold md:hidden">{title}</h1>
            {children}
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={btn("outline", "lg", "w-full")}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      Google ile devam et
    </button>
  );
}
