"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { btn, inputClass } from "@/lib/btn";
import { useAct } from "@/lib/store";

export default function Page() {
  const act = useAct();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <AuthCard
      title="Şifreni sıfırla."
      subtitle="E-postana bir link gönderelim, yeni şifreni belirle."
      footer={
        <Link href="/giris" className="font-semibold text-primary hover:underline">
          Giriş sayfasına dön
        </Link>
      }
    >
      {sent ? (
        <div className="grid gap-4 text-center">
          <MailCheck className="mx-auto size-12 text-ok" />
          <p className="text-sm">Bu adresle bir hesap varsa şifre sıfırlama linki gönderdik. Gelen kutunu (ve gereksiz klasörünü) kontrol et.</p>
        </div>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const ok = await act(requestPasswordReset({ email }));
            setBusy(false);
            if (ok) setSent(true);
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium">
            E-posta
            <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
          </label>
          <button disabled={busy} className={btn("primary", "lg", "mt-2 w-full")}>
            {busy ? "Gönderiliyor…" : "Sıfırlama linki gönder"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
