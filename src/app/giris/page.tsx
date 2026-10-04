"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { demoLogin, login } from "@/app/actions/auth";
import { AuthCard, GoogleButton, OrDivider } from "@/components/auth-card";
import { btn, inputClass } from "@/lib/btn";
import { safeNext } from "@/lib/safe";
import { useAct } from "@/lib/store";

function LoginForm() {
  const act = useAct();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const done = (ok: unknown) => {
    setBusy(false);
    if (!ok) return;
    router.replace(next);
    router.refresh();
  };

  return (
    <AuthCard
      title="Tekrar hoş geldin."
      subtitle="Profiline, ligine ve takımlarına kaldığın yerden devam et."
      footer={
        <>
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-primary hover:underline">
            Kayıt ol
          </Link>
        </>
      }
    >
      {params.get("hata") === "link" && (
        <p className="mb-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">Linkin süresi dolmuş ya da daha önce kullanılmış. Tekrar giriş yap ya da yeni link iste.</p>
      )}
      <GoogleButton next={next} />
      <OrDivider />
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          done(await act(login({ email, password: pw })));
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          E-posta
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span className="flex items-center justify-between">
            Şifre
            <Link href="/sifremi-unuttum" className="text-xs font-normal text-muted-foreground hover:text-foreground">
              Şifremi unuttum
            </Link>
          </span>
          <input className={inputClass} type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </label>
        <button disabled={busy} className={btn("primary", "lg", "mt-2 w-full")}>
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          done(await act(demoLogin()));
        }}
        className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Demo hesabıyla gir (Deniz Kaya)
      </button>
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
