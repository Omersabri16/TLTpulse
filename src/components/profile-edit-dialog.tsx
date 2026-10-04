"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Choice, Field, Modal } from "@/components/modal";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { useApp } from "@/lib/store";
import { FIELDS, type Field as FieldT } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileEditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <ProfileEditBody onOpenChange={onOpenChange} /> : null;
}

function ProfileEditBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const profile = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const [f, setF] = useState(profile);
  const [skills, setSkills] = useState<string[]>(() => profile?.skills.map((s) => s.name) ?? []);

  if (!f) return null;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  const save = () => {
    const prev = profile!.skills;
    update({
      ...f,
      github: f.github.replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, ""),
      skills: skills.map((name) => prev.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? { name, proof: "Beyan" as const }),
      education: f.school && !f.education.length ? [{ school: f.school, department: f.department, start: "", end: "" }] : f.education,
    });
    toast.success("Profil güncellendi");
    onOpenChange(false);
  };

  return (
    <Modal open onOpenChange={onOpenChange} title="Profili düzenle" className="sm:max-w-2xl">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad soyad">
            <input className={inputClass} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Başlık">
            <input className={inputClass} value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Backend geliştirici" />
          </Field>
        </div>
        <Field label="Alan">
          <Choice<FieldT | ""> value={f.field} onChange={(v) => set("field", v)} options={FIELDS} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Okul">
            <input className={inputClass} value={f.school} onChange={(e) => set("school", e.target.value)} />
          </Field>
          <Field label="Bölüm">
            <input className={inputClass} value={f.department} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label="Şehir">
            <input className={inputClass} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
        </div>
        <Field label="GitHub kullanıcı adı">
          <input className={inputClass} value={f.github} onChange={(e) => set("github", e.target.value)} placeholder="kullaniciadi" />
        </Field>
        <Field label="Hakkında" hint={`${f.about.length} karakter`}>
          <textarea className={cn(inputClass, "h-auto min-h-24 py-3")} value={f.about} onChange={(e) => set("about", e.target.value)} placeholder="Ne üzerinde çalışmayı seviyorsun?" />
        </Field>
        <Field label="Beceriler" hint="Projelerinle kanıtlananlar ✓ ile görünür; diğerleri beyan.">
          <TagInput value={skills} onChange={setSkills} />
        </Field>
        <Field label="İlgi alanları">
          <TagInput value={f.interests} onChange={(v) => set("interests", v)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => onOpenChange(false)} className={btn("ghost")}>
            Vazgeç
          </button>
          <button className={btn("primary")}>Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}
