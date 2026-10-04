"use client";

import { BadgeCheck, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { verifyGithub } from "@/app/actions/profile";
import { btn } from "@/lib/btn";
import { useAct, useApp } from "@/lib/store";

/**
 * GitHub kullanıcı adının bu kişiye ait olduğunu kanıtlama: bio'ya tek seferlik kod yazılır,
 * sunucu GitHub'dan okuyup doğrular. Doğrulandıktan sonra kod bio'dan silinebilir.
 */
export function GithubVerify({ onVerified }: { onVerified?: () => void }) {
  const profile = useApp((s) => s.profile);
  const act = useAct();
  const [busy, setBusy] = useState(false);
  if (!profile?.github) return null;

  if (profile.githubVerified)
    return (
      <p className="flex items-center gap-1.5 text-sm text-ok">
        <BadgeCheck className="size-4" /> github.com/{profile.github} doğrulandı
      </p>
    );

  return (
    <div className="grid gap-3 rounded-2xl border border-dashed p-4 text-sm">
      <p>
        <b>@{profile.github}</b> hesabının sana ait olduğunu doğrula. GitHub profilinin açıklamasına (bio) şu kodu ekle, kaydet ve &quot;Doğrula&quot;ya bas:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-xl bg-muted px-3 py-2 font-mono text-sm">{profile.githubCode}</code>
        <button
          type="button"
          className={btn("ghost", "sm")}
          onClick={() => navigator.clipboard.writeText(profile.githubCode).then(() => toast.success("Kod kopyalandı"))}
          aria-label="Kodu kopyala"
        >
          <Copy />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="https://github.com/settings/profile" target="_blank" rel="noreferrer" className={btn("outline", "sm")}>
          GitHub profil ayarları <ExternalLink />
        </a>
        <button
          type="button"
          disabled={busy}
          className={btn("primary", "sm")}
          onClick={async () => {
            setBusy(true);
            const me = await act(verifyGithub());
            setBusy(false);
            if (me) {
              toast.success("GitHub hesabın doğrulandı. Kodu bio'dan silebilirsin.");
              onVerified?.();
            }
          }}
        >
          {busy ? "Kontrol ediliyor…" : "Doğrula"}
        </button>
      </div>
    </div>
  );
}
