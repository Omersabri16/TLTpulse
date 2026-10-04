"use client";

import { ExternalLink, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Choice, Field, Modal } from "@/components/modal";
import { btn, inputClass } from "@/lib/btn";
import { isCorporateEmail } from "@/lib/score";
import { useApp } from "@/lib/store";
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
  const requestReference = useApp((s) => s.requestReference);
  const addExperience = useApp((s) => s.addExperience);

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
  const [token, setToken] = useState<string | null>(null);


  const send = () => {
    const email = approverEmail.trim().toLowerCase();
    if (!approverName.trim()) return setErr("Onaylayacak kişinin adını yaz.");
    if (!/\S+@\S+\.\S+/.test(email)) return setErr("Geçerli bir e-posta gir.");
    if (email === profile?.email.toLowerCase()) return setErr("Kendi e-postanı onaylayıcı olarak giremezsin.");
    if (references.filter((r) => r.approverEmail.toLowerCase() === email).length >= 3) return setErr("Aynı kişiden en fazla 3 onay istenebilir.");

    let targetType: "experience" | "project" = "experience";
    let targetId = "";
    let targetLabel = "";
    if (target === NEW) {
      if (!title.trim() || !org.trim()) return setErr("Deneyimin unvanını ve kurumunu yaz.");
      targetId = addExperience({ kind, title: title.trim(), org: org.trim(), start: start.trim(), end: end.trim() || "Devam ediyor" });
      targetLabel = `${title.trim()} · ${org.trim()}`;
    } else if (target.startsWith("exp:")) {
      const e = experiences.find((x) => `exp:${x.id}` === target)!;
      targetId = e.id;
      targetLabel = `${e.title} · ${e.org}`;
    } else {
      const p = projects.find((x) => `prj:${x.id}` === target)!;
      targetType = "project";
      targetId = p.id;
      targetLabel = `${p.name} projesi`;
    }
    setErr("");
    setToken(requestReference({ targetType, targetId, targetLabel, approverName: approverName.trim(), approverEmail: email, relation }));
  };

  const corporate = approverEmail.includes("@") && isCorporateEmail(approverEmail);

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={token ? "Onay isteği gönderildi" : "Onay iste"}
      description={token ? undefined : "Stajını, işini ya da projeni amirin veya hocan onaylasın. Ona e-postayla bir link gider."}
      className="sm:max-w-xl"
    >
      {token ? (
        <div className="grid gap-5">
          <div className="flex gap-3 rounded-2xl bg-ok-bg p-4 text-sm text-ok">
            <MailCheck className="mt-0.5 size-5 shrink-0" />
            <p>
              <b>{approverName}</b> adlı kişiye ({approverEmail}) onay linki gönderildi. Onaylayınca profilinde &quot;Onaylı&quot; etiketi ve yorumu görünecek, puanın artacak.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            Demo: e-posta yerine onay sayfasını buradan açabilirsin.
            <Link href={`/onay/${token}`} target="_blank" className={btn("outline", "sm", "mt-3 w-full")}>
              Onaylayıcının göreceği sayfayı aç <ExternalLink />
            </Link>
          </div>
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
          {approverEmail.includes("@") && (
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
            <button className={btn("primary")}>Onay linkini gönder</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
