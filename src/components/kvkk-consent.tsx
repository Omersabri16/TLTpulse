"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** KVKK açık rıza kutusu (zorunlu): aydınlatma metni + yurt dışına aktarım (Supabase Frankfurt, Vercel, Gemini). */
export function KvkkConsent({ checked, onChange, className }: { checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-left text-xs leading-relaxed text-muted-foreground", className)}>
      <input type="checkbox" required checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
      <span>
        <Link href="/gizlilik" target="_blank" className="font-semibold text-primary hover:underline">
          Aydınlatma metnini
        </Link>{" "}
        okudum; kişisel verilerimin bu metinde yazan amaçlarla işlenmesine ve yurt dışındaki hizmet sağlayıcılara (Supabase, Vercel, Google Gemini) aktarılmasına açık rıza veriyorum.
      </span>
    </label>
  );
}
