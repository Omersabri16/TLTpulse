"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";
import { requestApproval } from "@/app/actions/approvals";
import { Choice, Field, Modal } from "@/components/modal";
import { btn, inputClass } from "@/lib/btn";
import { isCorporateEmail, isDeclared } from "@/lib/score";
import { useAct, useApp } from "@/lib/store";
import type { ExperienceKind, Relation } from "@/lib/types";
import { cn } from "@/lib/utils";

const RELATIONS: Relation[] = ["Staj amiri", "Hoca", "İşveren", "Takım arkadaşı"];
const NEW = "__yeni__";

/**
 * Amir/hoca onayı isteme (kararlar.md Bölüm 3). Kullanıcı onaylayıcının e-postasını girer,
 * ona tek kullanımlık link gider; onaylayıcı /onay/[token] sayfasında onaylar ve yorum yazar.
 */
export function ReferenceDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: string }) {
  return open ? <ReferenceBody onOpenChange={onOpenChange} preset={preset} /> : null;
}

function ReferenceBody({ onOpenChange, preset }: { onOpenChange: (o: boolean) => void; preset?: string }) {
  const profile = useApp((s) => s.profile);
  const projects = useApp((s) => s.projects);
  const references = useApp((s) => s.references);
  const certs = useApp((s) => s.certs).filter((c) => isDeclared(c.status));
  const act = useAct();
  const [busy, setBusy] = useState(false);

  const experiences = profile?.experiences ?? [];
  const [target, setTarget] = useState(() => preset ?? (experiences[0] ? `exp:${experiences[0].id}` : NEW));
  const [kind, setKind] = useState<ExperienceKind>("Staj");
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [relation, setRelation] = useState<Relation>("Staj amiri");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);


  const send = async () => {
    const email = approverEmail.trim().toLowerCase();
    if (!approverName.trim()) return setErr("Onaylayacak kişinin adını yaz.");
    if (!/\S+@\S+\.\S+/.test(email)) return setErr("Geçerli bir e-posta gir.");
    if (email === profile?.email.toLowerCase()) return setErr("Kendi e-postanı onaylayıcı olarak giremezsin.");
    if (references.filter((r) => r.approverEmail.toLowerCase() === email).length >= 3) return setErr("Aynı kişiden en fazla 3 onay istenebilir.");
    if (target === NEW && (!title.trim() || !org.trim())) return setErr("Deneyimin unvanını ve kurumunu yaz.");
    setErr("");

    const t =
      target === NEW
        ? { type: "new" as const, kind, title, org, start, end }
        : target.startsWith("exp:")
          ? { type: "experience" as const, id: target.slice(4) }
          : target.startsWith("crt:")
            ? { type: "certificate" as const, id: target.slice(4) }
            : { type: "project" as const, id: target.slice(4) };
    setBusy(true);
    const ok = await act(requestApproval({ target: t, approverName, approverEmail: email, relation }));
    setBusy(false);
    if (ok) setSent(true);
  };

  const corporate = approverEmail.includes("@") && isCorporateEmail(approverEmail);

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={sent ? "Onay isteği gönderildi" : "Onay iste"}
      description={sent ? undefined : "Stajını, işini, projeni ya da sertifikanı amirin veya hocan onaylasın. Ona e-postayla bir link gider."}
      className="sm:max-w-xl"
    >
      {sent ? (
        <div className="grid gap-5">
          <div className="flex gap-3 rounded-2xl bg-ok-bg p-4 text-sm text-ok">
            <MailCheck className="mt-0.5 size-5 shrink-0" />
            <p>
              <b>{approverName}</b> adlı kişiye ({approverEmail}) onay linki gönderildi. Onaylayınca profilinde &quot;Onaylı&quot; etiketi ve yorumu görünecek, puanın artacak.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Link 14 gün geçerli ve tek kullanımlık. Sadece onaylayacak kişinin e-postasına gider; sana gösterilmez.</p>
          <div className="flex justify-end">
            <button onClick={() => onOpenChange(false)} className={btn("primary")}>
              Tamam
            </button>
          </div>
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Field label="Neyi onaylasın?">
            <select className={cn(inputClass, "appearance-auto")} value={target} onChange={(e) => setTarget(e.target.value)}>
              {experiences.map((x) => (
                <option key={x.id} value={`exp:${x.id}`}>
                  {x.kind}: {x.title} · {x.org}
                </option>
              ))}
              {projects.map((p) => (
                <option key={p.id} value={`prj:${p.id}`}>
                  Proje: {p.name}
                </option>
              ))}
              {certs.map((c) => (
                <option key={c.id} value={`crt:${c.id}`}>
                  Sertifika: {c.name} ({c.provider})
                </option>
              ))}
              <option value={NEW}>+ Yeni deneyim ekle</option>
            </select>
          </Field>

          {target === NEW && (
            <div className="grid gap-4 rounded-2xl bg-muted/60 p-4">
              <Choice value={kind} onChange={setKind} options={["Staj", "İş", "Gönüllü"]} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unvan: Backend stajyeri" />
                <input className={inputClass} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Kurum: Pusula Yazılım" />
                <input className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} placeholder="Başlangıç: Haz 2025" />
                <input className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Bitiş: Ağu 2025" />
              </div>
            </div>
          )}

          <Field label="Onaylayacak kişi">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputClass} value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Ad soyad" />
              <input className={inputClass} type="email" value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} placeholder="ad@firma.com.tr" />
            </div>
          </Field>
          {target.startsWith("crt:") ? (
            <p className="-mt-2 text-xs text-muted-foreground">Onaylanan sertifika 5 yerine 20 puan getirir.</p>
          ) : approverEmail.includes("@") && (
            <p className={cn("-mt-2 text-xs", corporate ? "text-ok" : "text-warn")}>
              {corporate ? "Kurumsal e-posta: onay tam puan alır." : "Kişisel e-posta: onay daha düşük ağırlık alır. Mümkünse kurum e-postasını gir."}
            </p>
          )}
          <Field label="Seninle ilişkisi">
            <Choice value={relation} onChange={setRelation} options={RELATIONS} />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button disabled={busy} className={btn("primary")}>
              {busy ? "Gönderiliyor…" : "Onay linkini gönder"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
