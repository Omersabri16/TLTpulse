"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { PulseIcon } from "@/components/brand";
import { Container, PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import { levelLabel } from "@/lib/score";
import { useIsClient } from "@/lib/store";
import { cvCode, useProfileData } from "@/lib/use-profile-data";

/** Sadece kanıtlı bilgilerden oluşan, QR ile doğrulanabilen CV (kararlar.md Bölüm 7). */
function Cv() {
  const { kullanici } = useParams<{ kullanici: string }>();
  const { data, ready } = useProfileData(kullanici);
  const isClient = useIsClient();
  const origin = isClient ? window.location.origin : "";

  if (!ready) return <div className="grid flex-1 place-items-center py-32 text-sm text-muted-foreground">Yükleniyor…</div>;
  if (!data) return <Container className="py-24 text-center text-xl font-semibold">Profil bulunamadı.</Container>;

  const code = cvCode(data.username);
  const verifyUrl = `${origin}/dogrula/${code}`;
  const exps = data.experiences.filter((e) => data.references.some((r) => r.targetId === e.id && r.status === "Onaylandı"));
  const certs = data.certs.filter((c) => c.status === "Doğrulandı");
  const skills = data.skills.filter((s) => s.proof !== "Beyan");

  return (
    <Container className="max-w-4xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/u/${kullanici}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Profile dön
        </Link>
        <button onClick={() => window.print()} className={btn("primary")}>
          <Printer /> Yazdır / PDF
        </button>
      </div>

      {/* CV kâğıdı: gece modunda da beyaz kalır */}
      <article className="rounded-3xl bg-white p-8 text-[#16163a] shadow-sm sm:p-12 print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 border-b border-[#e4e4ee] pb-8 sm:flex-row">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">{data.name}</h1>
            <p className="mt-1 text-lg text-[#626280]">{data.headline}</p>
            <p className="mt-3 text-sm text-[#626280]">
              {[data.school, data.city, data.github && `github.com/${data.github}`].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e4e1fb] px-3 py-1 text-xs font-semibold text-[#3b33b0]">
              {levelLabel(data.level)} · {data.score} puan
            </p>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
            {origin && <QRCodeSVG value={verifyUrl} size={104} fgColor="#16163a" />}
            <div className="text-xs text-[#626280] sm:text-right">
              Doğrulama kodu
              <b className="block font-mono text-sm text-[#16163a]">{code}</b>
            </div>
          </div>
        </header>

        {data.about && <p className="mt-8 leading-relaxed text-[#3a3a5a]">{data.about}</p>}

        <CvSection title="Projeler · kodla doğrulandı">
          {data.projects.map((p) => (
            <li key={p.id}>
              <b>{p.name}</b> <span className="text-[#626280]">· {p.difficulty}{p.quality && ` · ${p.quality}`}</span>
              <p className="text-sm text-[#626280]">{p.description}</p>
              <p className="text-xs text-[#626280]">{p.techs.join(" · ")}</p>
            </li>
          ))}
        </CvSection>

        {exps.length > 0 && (
          <CvSection title="Deneyim · üçüncü kişi onaylı">
            {exps.map((e) => {
              const r = data.references.find((x) => x.targetId === e.id)!;
              return (
                <li key={e.id}>
                  <b>{e.title}</b> <span className="text-[#626280]">· {e.org} · {e.start} – {e.end}</span>
                  <p className="text-xs text-[#626280]">
                    Onaylayan: {r.approverName} ({r.relation}, @{r.approverEmail.split("@")[1]})
                  </p>
                </li>
              );
            })}
          </CvSection>
        )}

        {data.competitions.length > 0 && (
          <CvSection title="Yarışmalar · platform içi teslim">
            {data.competitions.map((c) => (
              <li key={c.id}>
                <b>{c.label}</b> <span className="text-[#626280]">· {c.detail}</span>
              </li>
            ))}
          </CvSection>
        )}

        {certs.length > 0 && (
          <CvSection title="Sertifikalar · resmi kaynaktan doğrulandı">
            {certs.map((c) => (
              <li key={c.id}>
                <b>{c.name}</b> <span className="text-[#626280]">· {c.provider} · {fmtDate(c.date)}</span>
              </li>
            ))}
          </CvSection>
        )}

        {skills.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold tracking-[0.1em] text-[#5249d0] uppercase">Kanıtlı beceriler</h2>
            <p className="text-sm">{skills.map((s) => `${s.name} (${s.proof.toLowerCase()})`).join(" · ")}</p>
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-[#e4e4ee] pt-5 text-xs text-[#626280]">
          <span className="inline-flex items-center gap-1.5">
            <PulseIcon className="size-4 text-[#1aa7ec]" /> TLTpulse doğrulanmış CV
          </span>
          <span>Bu CV sadece kanıtı olan bilgileri içerir. QR ile güncel hali görülebilir.</span>
        </footer>
      </article>
    </Container>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-semibold tracking-[0.1em] text-[#5249d0] uppercase">{title}</h2>
      <ul className="grid gap-3">{children}</ul>
    </section>
  );
}

export default function Page() {
  return (
    <PageShell>
      <Cv />
    </PageShell>
  );
}
