"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard, GoogleButton } from "@/components/auth-card";
import { btn, inputClass } from "@/lib/btn";
import { useApp } from "@/lib/store";

function LoginForm() {
  const login = useApp((s) => s.login);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/profil";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const go = () => {
    login(email);
    router.push(next.startsWith("/") ? next : "/profil");
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
      <GoogleButton onClick={go} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ya da e-posta ile <span className="h-px flex-1 bg-border" />
      </div>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/\S+@\S+\.\S+/.test(email)) return setErr("Geçerli bir e-posta gir.");
          if (pw.length < 6) return setErr("Şifre en az 6 karakter olmalı.");
          go();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          E-posta
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Şifre
          <input className={inputClass} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className={btn("primary", "lg", "mt-2 w-full")}>Giriş yap</button>
      </form>
      <button type="button" onClick={go} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
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
