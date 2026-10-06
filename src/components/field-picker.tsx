"use client";

import { BrainCircuit, Bug, ChartBar, Cloud, Cpu, Database, Gamepad2, Layers, Layout, Server, ShieldCheck, Smartphone, TabletSmartphone, Workflow, type LucideIcon } from "lucide-react";
import { FIELD_GROUPS, FIELD_INFO, type Field } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FIELD_ICON: Record<Field, LucideIcon> = {
  Frontend: Layout,
  Backend: Server,
  "Full Stack": Layers,
  Veritabanı: Database,
  iOS: Smartphone,
  Android: Smartphone,
  "Cross-Platform": TabletSmartphone,
  "Veri Bilimi": ChartBar,
  "Yapay Zeka": BrainCircuit,
  "Siber Güvenlik": ShieldCheck,
  "Bulut Bilişim": Cloud,
  DevOps: Workflow,
  "Oyun Geliştirme": Gamepad2,
  "Gömülü / IoT": Cpu,
  "Test / QA": Bug,
};

/** Gruplu alan seçimi (onboarding: büyük kartlar, profil düzenleme: küçük haplar). */
export function FieldPicker({ value, onChange, compact = false }: { value: Field | ""; onChange: (f: Field) => void; compact?: boolean }) {
  return (
    <div className={cn("grid", compact ? "gap-3" : "gap-5")}>
      {FIELD_GROUPS.map((g) => (
        <div key={g.group}>
          <p className={cn("text-xs font-semibold tracking-wide text-muted-foreground uppercase", compact ? "mb-1.5" : "mb-2")}>{g.group}</p>
          <div className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-2")}>
            {g.fields.map((f) => {
              const Icon = FIELD_ICON[f];
              const on = value === f;
              return compact ? (
                <button
                  type="button"
                  key={f}
                  onClick={() => onChange(f)}
                  title={FIELD_INFO[f]}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition", on ? "border-primary bg-primary font-semibold text-primary-foreground" : "hover:bg-muted")}
                >
                  <Icon className="size-4" /> {f}
                </button>
              ) : (
                <button
                  type="button"
                  key={f}
                  onClick={() => onChange(f)}
                  className={cn("flex items-center gap-3 rounded-2xl border p-3.5 text-left transition", on ? "border-primary bg-secondary" : "hover:bg-muted")}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <b className="block font-semibold">{f}</b>
                    <span className="block text-xs text-muted-foreground">{FIELD_INFO[f]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Açılır listede gruplu alan seçimi (yol haritası hedefi). */
export function FieldSelect({ value, onChange, className, label }: { value: Field; onChange: (f: Field) => void; className?: string; label: string }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value as Field)} aria-label={label}>
      {FIELD_GROUPS.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
