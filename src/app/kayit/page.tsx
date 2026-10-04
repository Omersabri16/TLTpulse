"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, GoogleButton } from "@/components/auth-card";
import { btn, inputClass } from "@/lib/btn";
import { useApp } from "@/lib/store";

export default function Page() {
  const register = useApp((s) => s.register);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  return (
    <AuthCard
      title="Projelerin seni anlatsın."
      subtitle="Hesabını aç, alanını seç, ilk projeni ekle. Gerisini puanın anlatır."
      footer={
        <>
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-primary hover:underline">
            Giriş yap
          </Link>
        </>
      }
    >
      <GoogleButton
        onClick={() => {
          register("Yeni Kullanıcı", "yeni@gmail.com");
          router.push("/onboarding");
        }}
      />
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ya da e-posta ile <span className="h-px flex-1 bg-border" />
      </div>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().split(" ").length < 2) return setErr("Adını ve soyadını yaz.");
          if (!/\S+@\S+\.\S+/.test(email)) return setErr("Geçerli bir e-posta gir.");
          if (pw.length < 6) return setErr("Şifre en az 6 karakter olmalı.");
          register(name.trim(), email.trim());
          router.push("/onboarding");
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Ad soyad
          <input className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayşe Yıldız" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          E-posta
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Şifre
          <input className={inputClass} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="En az 6 karakter" />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className={btn("primary", "lg", "mt-2 w-full")}>Kayıt ol</button>
      </form>
    </AuthCard>
  );
}
