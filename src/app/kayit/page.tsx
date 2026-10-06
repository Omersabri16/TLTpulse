"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/app/actions/auth";
import { toast } from "sonner";
import { AuthCard, GoogleButton, OrDivider } from "@/components/auth-card";
import { KvkkConsent } from "@/components/kvkk-consent";
import { btn, inputClass } from "@/lib/btn";
import { useAct } from "@/lib/store";

export default function Page() {
  const act = useAct();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  if (sentTo)
    return (
      <AuthCard title="Neredeyse bitti." subtitle="Hesabını açmak için e-postanı doğrula." footer={<Link href="/giris" className="font-semibold text-primary hover:underline">Giriş sayfasına dön</Link>}>
        <div className="grid gap-4 text-center">
          <MailCheck className="mx-auto size-12 text-ok" />
          <p className="text-sm">
            <b>{sentTo}</b> adresine bir doğrulama linki gönderdik. Linke tıklayınca hesabın açılacak ve profilini doldurmaya başlayacaksın.
          </p>
          <p className="text-xs text-muted-foreground">E-posta birkaç dakikada gelmezse gereksiz (spam) klasörüne bak.</p>
        </div>
      </AuthCard>
    );

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
      <GoogleButton next="/onboarding" />
      <OrDivider />
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!kvkk) return toast.error("Devam etmek için aydınlatma metnini okuyup onay vermelisin.");
          setBusy(true);
          const res = await act(register({ name, email, password: pw, kvkk: true }));
          setBusy(false);
          if (!res) return;
          if (res.needsConfirm) return setSentTo(email.trim());
          router.replace("/onboarding");
          router.refresh();
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Ad soyad
          <input className={inputClass} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayşe Yıldız" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          E-posta
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Şifre
          <input className={inputClass} type="password" autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="En az 8 karakter" />
        </label>
        <KvkkConsent checked={kvkk} onChange={setKvkk} />
        <button disabled={busy} className={btn("primary", "lg", "mt-2 w-full")}>
          {busy ? "Hesap açılıyor…" : "Kayıt ol"}
        </button>
      </form>
    </AuthCard>
  );
}
