"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { setNewPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { btn, inputClass } from "@/lib/btn";
import { useAct } from "@/lib/store";

/** E-postadaki sıfırlama linki /auth/confirm üzerinden oturum açıp buraya getirir. */
export default function Page() {
  const act = useAct();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthCard title="Yeni şifre." subtitle="En az 8 karakter; harf ve rakam karışık olsun." footer={null}>
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw !== pw2) return toast.error("Şifreler aynı değil.");
          setBusy(true);
          const ok = await act(setNewPassword({ password: pw }));
          setBusy(false);
          if (!ok) return;
          toast.success("Şifren güncellendi.");
          router.replace("/profil");
          router.refresh();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Yeni şifre
          <input className={inputClass} type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Yeni şifre (tekrar)
          <input className={inputClass} type="password" autoComplete="new-password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </label>
        <button disabled={busy} className={btn("primary", "lg", "mt-2 w-full")}>
          {busy ? "Kaydediliyor…" : "Şifreyi kaydet"}
        </button>
      </form>
    </AuthCard>
  );
}
