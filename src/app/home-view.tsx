"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PulseLine } from "@/components/brand";
import { PageShell, Pill } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const DEMO_REPOS = [
  { name: "pulse-api", pts: 94 },
  { name: "taskflow", pts: 60 },
  { name: "query-lab", pts: 48 },
  { name: "edge-cache", pts: 82 },
  { name: "notes-app", pts: 10 },
];

function AuthButtons({ size = "lg" as const }) {
  const session = useApp((s) => s.session);
  if (session)
    return (
      <Link href="/profil" className={btn("primary", size)}>
        Profiline dön →
      </Link>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/giris" className={btn("primary", size)}>
        Giriş yap
      </Link>
      <Link href="/kayit" className={btn("onNavy", size)}>
        Kayıt ol
      </Link>
    </div>
  );
}

function Chapter({ no, title, text, children }: { no: string; title: string; text: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t py-14 first:border-t-0 md:grid-cols-[110px_1fr_1fr] md:gap-10 md:py-16">
      <div className="text-5xl leading-none font-semibold tracking-tighter text-primary md:text-6xl">{no}</div>
      <div>
        <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-[38px]">{title}</h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">{text}</p>
      </div>
      <div className="rounded-3xl border bg-card px-5 py-2">{children}</div>
    </section>
  );
}

function Row({ title, sub, right, strike }: { title: string; sub?: string; right: ReactNode; strike?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t py-3.5 text-sm first:border-t-0">
      <div className="min-w-0">
        <b className={cn("font-semibold", strike && "text-muted-foreground line-through")}>{title}</b>
        {sub && <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>}
      </div>
      {right}
    </div>
  );
}

export function HomeView() {
  const [on, setOn] = useState<number[]>([0, 1]);
  const score = on.reduce((a, i) => a + DEMO_REPOS[i].pts, 0);
  const toggle = (i: number) => setOn((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <PageShell>
      <section className="overflow-hidden bg-navy text-on-navy">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
          <h1 className="max-w-4xl text-5xl leading-[0.98] font-semibold tracking-[-0.04em] sm:text-7xl lg:text-[92px]">
            Projelerin
            <br />
            seni <span className="text-cyan">anlatsın.</span>
          </h1>
          <div className="mt-8 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <p className="max-w-md text-[17px] leading-relaxed text-on-navy-muted">
              TLTpulse, yazılımcıların ne yaptığını iddia ile değil, kodla gösterdiği yer. Projeni ekle, ligde yüksel, yarışmalarda takım kur.
            </p>
            <AuthButtons />
          </div>

          <div className="mt-14 border-t border-navy-line pt-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl leading-none font-semibold text-cyan tabular-nums">{score}</span>
                <span className="text-sm text-on-navy-muted">{score >= 100 ? "sezon puanı · yükselme çizgisinin üstünde" : "sezon puanı"}</span>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Örnek repolar">
                {DEMO_REPOS.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => toggle(i)}
                    aria-pressed={on.includes(i)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs transition",
                      on.includes(i) ? "border-cyan bg-cyan font-semibold text-navy" : "border-navy-line text-on-navy hover:bg-navy-2",
                    )}
                  >
                    {on.includes(i) ? "✓ " : "+ "}
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            <PulseLine beats={on.length} className="mt-2 text-cyan transition-all" height={140} />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Chapter no="01" title="Projelerini ekle." text={<>GitHub linkini yapıştır, projeni bir cümleyle anlat. <b>AI kodu okuyup zorluğu sınıflandırır</b> ve gerekçesini dosyayla gösterir; puanı kural verir. Kopya ve şablon kod sayılmaz, sadece senin yazdığın repolar.</>}>
          <Row title="pulse-api" sub="Zor · WebSocket sunucusu: server/ws.ts" right={<Pill tone="ok">+94 puan</Pill>} />
          <Row title="taskflow" sub="Orta · Giriş ve veritabanı: src/auth.ts" right={<Pill tone="ok">+60 puan</Pill>} />
          <Row title="todo-klon" sub="Dosyaların %92'si başka bir projede" strike right={<Pill tone="danger">Kopya</Pill>} />
        </Chapter>

        <Chapter no="02" title="Puanın altı yerden gelir." text={<>Projeler, yarışmalar, takım arkadaşlarının verdiği <b>akran puanı</b>, sertifikalar, amir ya da hocanın onayı ve yol haritasındaki adımlar. Hepsi kural tabanlı ve üst sınır yok: ne kadar çok iş, o kadar puan.</>}>
          {[
            ["Projeler", "proje başı 100'e kadar"],
            ["Yarışmalar", "zorluğa göre 100 / 150 / 200'e kadar"],
            ["Akran puanı", "yarışma başı 30'a kadar"],
            ["Sertifikalar", "5–25"],
            ["Amir ve hoca onayı", "10–35"],
            ["Yol haritası", "adım başı 5–10"],
          ].map(([l, m]) => (
            <Row key={l} title={l} right={<span className="text-xs text-muted-foreground">{m}</span>} />
          ))}
        </Chapter>

        <Chapter no="03" title="Sezonda yüksel." text={<>Herkes <b>Yeni başlayan</b> liginde başlar. 6 aylık sezonun sonunda her ligin <b>ilk 20&apos;si</b> bir üst lige çıkar: Orta, sonra Kıdemli. Kıdemli&apos;nin ilk 20&apos;si sezon şampiyonu olur.</>}>
          <div className="flex flex-wrap gap-2 py-4">
            <Pill tone="muted">Yeni başlayan</Pill>
            <Pill tone="lav">Orta</Pill>
            <Pill tone="muted">Kıdemli</Pill>
          </div>
          <Row title="19 · Ece Yılmaz" sub="Frontend" right={<b className="text-lg text-cyan-ink">212</b>} />
          <Row title="20 · Arda Demir" sub="Backend" right={<b className="text-lg text-cyan-ink">198</b>} />
          <div className="flex items-center gap-2 border-t py-2 text-xs font-semibold text-ok">▲ Yükselme çizgisi</div>
          <Row title="21 · Sen" sub="Bir proje daha ekle" right={<b className="text-lg text-cyan-ink">176</b>} />
        </Chapter>

        <Chapter no="04" title="Yarışmada takım kur." text={<>Her yarışmanın bir şartnamesi var. Bir pozisyona başvurursun, <b>sistem seni dengeli bir takıma yerleştirir.</b> Kazanan yok: takımınız şartnameyi ne kadar karşılarsa o kadar puan alırsınız. Değerlendirmeyi gizli testler yapar, insan değil.</>}>
          <Row title="Y-07 · Etkinlik Kayıt" sub="Orta · en fazla 150 puan" right={<Pill tone="ok">Başvurular açık</Pill>} />
          <div className="grid grid-cols-3 gap-2 pb-4">
            {[
              ["Frontend", "Ece"],
              ["Backend", "Sen"],
              ["Veritabanı", "Kerem"],
            ].map(([f, n]) => (
              <div key={f} className="rounded-2xl bg-muted px-2 py-3 text-center text-xs text-muted-foreground">
                {f}
                <b className="mt-1 block text-sm text-foreground">{n}</b>
              </div>
            ))}
          </div>
        </Chapter>

        <Chapter no="05" title="Amirin onaylasın." text={<>Stajını, işini ya da projeni kanıtlamak için amirinin veya hocanın e-postasını gir. Ona bir link gider; <b>hesap açmadan onaylar</b> ve istersen bir yorum bırakır. Kanıtı olmayan beceri &quot;beyan&quot; olarak ayrı görünür.</>}>
          <Row title="Backend stajı · 2 ay" sub="@pusulayazilim.com.tr onayladı" right={<Pill tone="ok"><Check className="size-3" /> Onaylı</Pill>} />
          <Row title="Node.js" sub="pulse-api reposundan" right={<Pill tone="ok"><Check className="size-3" /> Kod</Pill>} />
          <Row title="Kubernetes" sub="Arkasında proje yok" right={<Pill tone="muted"><X className="size-3" /> Beyan</Pill>} />
        </Chapter>

        <Chapter no="06" title="Sıradaki adımını bil." text={<>Profilin dolunca AI, hedef pozisyonuna göre <b>sana özel bir yol haritası</b> çıkarır. Adımları tamamladıkça puan kazanırsın. Bağlantılarınla mesajlaş, takım arkadaşların ağında kalsın.</>}>
          <Row title="İlk projeni görünür kıl" right={<Pill tone="ok">✓ +10</Pill>} />
          <Row title="Testleri CI'da yeşil geçen bir proje ekle" right={<Pill tone="ok">✓ +10</Pill>} />
          <Row title="Y-07'de Backend pozisyonuna başvur" right={<Pill tone="lav">+5 puan</Pill>} />
        </Chapter>
      </div>

      <section className="bg-navy py-20 text-center text-on-navy sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
            İlk projenle <span className="text-cyan">ilk atışı</span> yap.
          </h2>
          <p className="mt-5 mb-8 text-on-navy-muted">Ücretsiz. E-posta ya da Google hesabın yeterli.</p>
          <div className="flex justify-center">
            <AuthButtons />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
