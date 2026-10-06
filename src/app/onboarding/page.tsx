"use client";

import { Check, Database, FileUp, Layout, Server, Smartphone, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptKvkk } from "@/app/actions/account";
import { CvUploadDialog } from "@/components/cv-upload-dialog";
import { KvkkConsent } from "@/components/kvkk-consent";
import { Container, PageHero, PageShell } from "@/components/page-shell";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { saveProfile } from "@/app/actions/profile";
import { useAct, useApp } from "@/lib/store";
import { FIELDS, type Field } from "@/lib/types";
import { cn } from "@/lib/utils";

const FIELD_ICON = { Frontend: Layout, Backend: Server, Veritabanı: Database, Mobil: Smartphone, DevOps: Workflow };
const SKILLS: Record<Field, string[]> = {
  Frontend: ["React", "TypeScript", "Next.js", "Tailwind", "Vue", "Test"],
  Backend: ["Node.js", "Go", "Java", "PostgreSQL", "Docker", "Redis"],
  Veritabanı: ["SQL", "PostgreSQL", "MySQL", "MongoDB", "Python"],
  Mobil: ["Flutter", "Kotlin", "Swift", "React Native", "Firebase"],
  DevOps: ["Docker", "Kubernetes", "GitHub Actions", "Terraform", "Linux"],
};

function Onboarding() {
  const profile = useApp((s) => s.profile)!;
  const kvkkAccepted = useApp((s) => s.kvkkAccepted);
  const [consent, setConsent] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [field, setField] = useState<Field | "">(profile.field);
  const [school, setSchool] = useState(profile.school);
  const [department, setDepartment] = useState(profile.department);
  const [city, setCity] = useState(profile.city);
  const [github, setGithub] = useState(profile.github);
  const [skills, setSkills] = useState<string[]>(profile.skills.map((s) => s.name));
  const [interests, setInterests] = useState<string[]>(profile.interests);

  const steps = ["Alan", "Eğitim", "GitHub ve beceriler"];
  const canNext = step === 0 ? !!field : step === 1 ? !!school : true;

  const finish = async () => {
    if (!kvkkAccepted) {
      if (!consent) return setStep(0);
      if (!(await act(acceptKvkk()))) return;
    }
    setBusy(true);
    const ok = await act(
      saveProfile({
        field,
        headline: field ? `${field} geliştirici` : "",
        school,
        department,
        city,
        github,
        skills,
        interests,
        education: school ? [{ school, department, start: "", end: "" }] : [],
      }),
    );
    setBusy(false);
    if (ok) router.push("/profil");
  };

  return (
    <>
      <PageHero eyebrow={`Adım ${step + 1} / 3`} title="Profilini" highlight="kur." subtitle="Üç kısa adım. Sonra istediğin zaman değiştirebilirsin." />
      <Container className="max-w-3xl">
        {!kvkkAccepted && (
          <div className="mb-6 rounded-3xl border bg-card p-5">
            <KvkkConsent checked={consent} onChange={setConsent} />
          </div>
        )}
        <div className="mb-6 flex flex-col gap-3 rounded-3xl bg-navy p-5 text-on-navy sm:flex-row sm:items-center sm:justify-between">
          <div>
            <b className="block">CV&apos;n var mı?</b>
            <span className="text-sm text-on-navy-muted">Yükle, AI becerilerini, deneyimlerini ve eğitimini çıkarsın. Dosyan saklanmaz.</span>
          </div>
          <button type="button" disabled={!kvkkAccepted && !consent} onClick={async () => {
              if (!kvkkAccepted && !(await act(acceptKvkk()))) return;
              setCvOpen(true);
            }} className={btn("primary", "md", "shrink-0")}>
            <FileUp /> CV&apos;mi yükle
          </button>
        </div>
        <CvUploadDialog
          open={cvOpen}
          onOpenChange={setCvOpen}
          onApplied={(me) => {
            if (!me.profile) return;
            setSkills((cur) => [...new Set([...cur, ...me.profile!.skills.map((x) => x.name)])]);
            const e = me.profile.education[0];
            if (e && !school) {
              setSchool(e.school);
              setDepartment(e.department);
            }
          }}
        />
        <ol className="mb-8 flex gap-2">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex flex-1 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium", i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-ok-bg text-ok" : "bg-card text-muted-foreground border")}>
              {i < step ? <Check className="size-3.5" /> : <span>{i + 1}</span>} <span className="truncate">{s}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-3xl border bg-card p-6 sm:p-8">
          {step === 0 && (
            <>
              <h2 className="text-xl font-semibold">Hangi alanda çalışıyorsun?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ligde bu alanla filtrelenirsin, yarışmalarda bu pozisyona başvurursun.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {FIELDS.map((f) => {
                  const Icon = FIELD_ICON[f];
                  return (
                    <button
                      key={f}
                      onClick={() => setField(f)}
                      className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", field === f ? "border-primary bg-secondary" : "hover:bg-muted")}
                    >
                      <span className={cn("grid size-10 place-items-center rounded-xl", field === f ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <Icon className="size-5" />
                      </span>
                      <b className="font-semibold">{f}</b>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">Nerede okuyorsun ya da okudun?</h2>
              <label className="grid gap-1.5 text-sm font-medium">
                Okul
                <input className={inputClass} value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Cumhuriyet Üniversitesi" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Bölüm
                <input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Bilgisayar Mühendisliği" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Şehir
                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sivas" />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-semibold">GitHub ve beceriler</h2>
              <label className="grid gap-1.5 text-sm font-medium">
                GitHub kullanıcı adı
                <div className="flex items-center rounded-2xl border border-input bg-card pl-4 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
                  <span className="text-muted-foreground">github.com/</span>
                  <input className="h-11 flex-1 bg-transparent pr-4 outline-none" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="kullaniciadi" />
                </div>
                <span className="text-xs font-normal text-muted-foreground">Projelerindeki commit yazarlığı bu hesapla kontrol edilir.</span>
              </label>
              <div className="grid gap-1.5 text-sm font-medium">
                Beceriler
                <TagInput value={skills} onChange={setSkills} placeholder="Yaz ve Enter'a bas" suggestions={field ? SKILLS[field] : []} />
                <span className="text-xs font-normal text-muted-foreground">Proje ekleyene kadar &quot;beyan&quot; olarak görünür.</span>
              </div>
              <div className="grid gap-1.5 text-sm font-medium">
                İlgi alanları
                <TagInput value={interests} onChange={setInterests} placeholder="Ör. Açık kaynak" suggestions={["Açık kaynak", "Yapay zeka", "Oyun", "Fintek", "Mentorluk", "Erişilebilirlik"]} />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => (step ? setStep(step - 1) : router.push("/profil"))} className={btn("ghost")}>
              {step ? "Geri" : "Sonra yaparım"}
            </button>
            {step < 2 ? (
              <button disabled={!canNext} onClick={() => setStep(step + 1)} className={btn("primary")}>
                Devam →
              </button>
            ) : (
              <button onClick={finish} disabled={busy} className={btn("primary")}>
                {busy ? "Kaydediliyor…" : "Profilime git →"}
              </button>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Onboarding />
    </PageShell>
  );
}
