"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Uygulamadaki tüm açılır pencereler için ortak kabuk. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-lg", className)}>
        <div className="border-b px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1.5">{description}</DialogDescription>}
        </div>
        <div className="px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition select-none", checked ? "border-primary bg-secondary text-secondary-foreground" : "hover:bg-muted")}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn("grid size-4 place-items-center rounded-[5px] border text-[10px]", checked && "border-primary bg-primary text-primary-foreground")}>{checked && "✓"}</span>
      {label}
    </label>
  );
}

export function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => onChange(o)}
          className={cn("rounded-full border px-3.5 py-2 text-sm transition", value === o ? "border-primary bg-primary font-semibold text-primary-foreground" : "hover:bg-muted")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
