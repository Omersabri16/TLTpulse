"use client";

import { BadgeCheck, CircleAlert, CircleX, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Choice, Field, Modal } from "@/components/modal";
import { btn, inputClass } from "@/lib/btn";
import { celebrateIfLevelUp } from "@/lib/celebrate";
import { SOURCE_MAX, verifyCertificate } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";
import type { CertProvider, CertStatus } from "@/lib/types";

const PROVIDERS: CertProvider[] = ["BTK Akademi", "Credly", "Coursera", "Udemy", "Diğer"];
const PLACEHOLDER: Record<CertProvider, string> = {
  "BTK Akademi": "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=…",
  Credly: "https://www.credly.com/badges/…",
  Coursera: "https://www.coursera.org/account/accomplishments/verify/…",
  Udemy: "https://www.udemy.com/certificate/UC-…",
  Diğer: "Sertifika linki ya da numarası",
};
const STATUS_UI: Record<CertStatus, { icon: typeof BadgeCheck; cls: string; text: string }> = {
  Doğrulandı: { icon: BadgeCheck, cls: "bg-ok-bg text-ok", text: "Sertifika resmi kaynaktan doğrulandı ve isim eşleşti." },
  "İsim uyuşmuyor": { icon: CircleAlert, cls: "bg-warn-bg text-warn", text: "Sertifika bulundu ama üzerindeki isim profilindeki isimle eşleşmiyor. Puan verilmez." },
  Doğrulanamadı: { icon: CircleX, cls: "bg-muted text-muted-foreground", text: "Bu kaynak otomatik doğrulanamıyor. Profilinde \"beyan\" olarak görünür, düşük puan alır." },
};

export function CertificateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <CertificateBody onOpenChange={onOpenChange} /> : null;
}

function CertificateBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const profile = useApp((s) => s.profile);
  const addCertificate = useApp((s) => s.addCertificate);
  const score = useMyScore();
  const [provider, setProvider] = useState<CertProvider>("BTK Akademi");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [nameOnCert, setNameOnCert] = useState(profile?.name ?? "");
  const [phase, setPhase] = useState<"form" | "checking" | "result">("form");
  const [res, setRes] = useState<{ status: CertStatus; points: number } | null>(null);
  const [err, setErr] = useState("");

  const check = () => {
    if (!name.trim()) return setErr("Sertifikanın adını yaz.");
    if (!link.trim()) return setErr("Sertifika linkini yapıştır.");
    setErr("");
    setRes(verifyCertificate(provider, link, nameOnCert, profile?.name ?? ""));
    setPhase("checking");
    setTimeout(() => setPhase("result"), 1300);
  };

  const save = () => {
    if (!res) return;
    const part = score.parts.find((p) => p.source === "Sertifikalar")!;
    const gain = Math.min(res.points, SOURCE_MAX.Sertifikalar - part.points);
    addCertificate({ id: `c-${Date.now()}`, name: name.trim(), provider, link: link.trim(), date: new Date().toISOString().slice(0, 10), status: res.status, points: res.points });
    if (!celebrateIfLevelUp(score.total, score.total + gain)) toast.success("Sertifika eklendi", { description: gain ? `+${gain} puan` : undefined });
    onOpenChange(false);
  };

  const ui = res ? STATUS_UI[res.status] : null;

  return (
    <Modal open onOpenChange={onOpenChange} title="Sertifika ekle" description="BTK Akademi ve Credly sertifikaları resmi kaynaktan otomatik doğrulanır.">
      {phase === "form" && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <Field label="Nereden aldın?">
            <Choice value={provider} onChange={setProvider} options={PROVIDERS} />
          </Field>
          <Field label="Sertifika adı">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="SQL ile Veritabanı Programlama" />
          </Field>
          <Field label="Doğrulama linki">
            <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder={PLACEHOLDER[provider]} />
          </Field>
          <Field label="Sertifikadaki isim" hint="Profilindeki isimle karşılaştırılır (Türkçe karakterler fark etmez).">
            <input className={inputClass} value={nameOnCert} onChange={(e) => setNameOnCert(e.target.value)} />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button className={btn("primary")}>Doğrula</button>
          </div>
        </form>
      )}
      {phase === "checking" && (
        <div className="flex items-center gap-3 py-8 text-sm">
          <Loader2 className="size-5 animate-spin text-primary" /> {provider} kaynağından kontrol ediliyor…
        </div>
      )}
      {phase === "result" && res && ui && (
        <div className="grid gap-5">
          <div className={`flex gap-3 rounded-2xl p-4 text-sm ${ui.cls}`}>
            <ui.icon className="mt-0.5 size-5 shrink-0" />
            <div>
              <b className="block">{res.status}</b>
              {ui.text}
            </div>
          </div>
          <p className="text-sm">
            <b>{name}</b> · {provider} · <span className="font-semibold text-primary">+{res.points} puan</span>
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPhase("form")} className={btn("ghost")}>
              Düzenle
            </button>
            <button onClick={save} className={btn("primary")}>
              Profile ekle
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
