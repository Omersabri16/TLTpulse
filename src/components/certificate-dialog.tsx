"use client";

import { BadgeCheck, CircleAlert, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addCertificate, checkCertificate } from "@/app/actions/projects";
import { Choice, Field, Modal } from "@/components/modal";
import { btn, inputClass } from "@/lib/btn";
import { celebrateIfAboveLine } from "@/lib/celebrate";
import { SOURCE_CHECKED } from "@/lib/score";
import { isHttpUrl } from "@/lib/safe";
import { useAct, useMyScore } from "@/lib/store";
import type { CertProvider, CertStatus } from "@/lib/types";

const PROVIDERS: CertProvider[] = ["BTK Akademi", "Credly", "Coursera", "Udemy", "Diğer"];
const PLACEHOLDER: Record<CertProvider, string> = {
  "BTK Akademi": "https://www.btkakademi.gov.tr/portal/certificate/validate?certificateId=…",
  Credly: "https://www.credly.com/badges/…",
  Coursera: "https://www.coursera.org/account/accomplishments/verify/…",
  Udemy: "https://www.udemy.com/certificate/UC-…",
  Diğer: "Sertifika linki ya da numarası",
};

const DECLARED = { icon: FileText, cls: "bg-muted text-muted-foreground", text: "Bu kaynak otomatik doğrulanamıyor. Profilinde \"beyan\" olarak görünür ve 5 puan getirir. Hocan ya da amirin onaylarsa 20 puan olur (profilde \"Onay iste\")." };
const STATUS_UI: Record<CertStatus, { icon: typeof BadgeCheck; cls: string; text: string }> = {
  Doğrulandı: { icon: BadgeCheck, cls: "bg-ok-bg text-ok", text: "Sertifika resmi kaynaktan doğrulandı ve üzerindeki isim profilindeki isimle eşleşti." },
  "İsim uyuşmuyor": { icon: CircleAlert, cls: "bg-warn-bg text-warn", text: "Sertifika bulundu ama üzerindeki isim profilindeki isimle eşleşmiyor. Puan verilmez. İsmin profilde sertifikadaki gibi yazılı mı?" },
  Onaylandı: { icon: BadgeCheck, cls: "bg-ok-bg text-ok", text: "Sertifika onaylandı." },
  Beyan: DECLARED,
  Doğrulanamadı: DECLARED,
};

export function CertificateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <CertificateBody onOpenChange={onOpenChange} /> : null;
}

function CertificateBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const score = useMyScore();
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<CertProvider>("BTK Akademi");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [phase, setPhase] = useState<"form" | "checking" | "result">("form");
  const [res, setRes] = useState<{ status: CertStatus; points: number } | null>(null);
  const [err, setErr] = useState("");

  const input = () => ({ name, provider, link });

  const check = async () => {
    if (!name.trim()) return setErr("Sertifikanın adını yaz.");
    if (!link.trim()) return setErr("Sertifikanın doğrulama linkini yapıştır.");
    if (!isHttpUrl(link)) return setErr("Link https:// ile başlamalı.");
    setErr("");
    setPhase("checking");
    const [r] = await Promise.all([act(checkCertificate(input())), new Promise((ok) => setTimeout(ok, 900))]);
    if (!r) return setPhase("form");
    setRes(r);
    setPhase("result");
  };

  const save = async () => {
    if (!res) return;
    setBusy(true);
    const r = await act(addCertificate(input()));
    setBusy(false);
    if (!r) return;
    if (!celebrateIfAboveLine(score, r.me.score)) toast.success("Sertifika eklendi", { description: r.points ? `+${r.points} puan` : undefined });
    onOpenChange(false);
  };

  const ui = res ? STATUS_UI[res.status] : null;

  return (
    <Modal open onOpenChange={onOpenChange} title="Sertifika ekle" description="BTK Akademi ve Credly sertifikaları resmi kaynaktan doğrulanır, isim sertifikanın üzerinden okunur.">
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
          {!SOURCE_CHECKED.includes(provider) && <p className="-mt-1 text-xs text-muted-foreground">Bu kaynak otomatik doğrulanmaz: beyan olarak 5 puan, onaylatırsan 20 puan.</p>}
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
          <Loader2 className="size-5 animate-spin text-primary" /> {SOURCE_CHECKED.includes(provider) ? `${provider} kaynağından kontrol ediliyor…` : "Kontrol ediliyor…"}
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
            <button onClick={save} disabled={busy} className={btn("primary")}>
              {busy ? "Ekleniyor…" : "Profile ekle"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
