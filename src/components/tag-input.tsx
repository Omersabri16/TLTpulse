"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Enter ya da virgülle etiket ekleyen alan. */
export function TagInput({ value, onChange, placeholder, suggestions = [], className }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[]; className?: string }) {
  const [text, setText] = useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText("");
  };
  const rest = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div className={className}>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`${t} kaldır`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
          placeholder={value.length ? "" : placeholder}
          className="h-8 min-w-24 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rest.slice(0, 8).map((s) => (
            <button type="button" key={s} onClick={() => add(s)} className={cn("rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground")}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
