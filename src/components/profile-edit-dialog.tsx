"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveProfile } from "@/app/actions/profile";
import { FieldPicker } from "@/components/field-picker";
import { GithubVerify } from "@/components/github-verify";
import { Field, Modal } from "@/components/modal";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { useAct, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProfileEditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return open ? <ProfileEditBody onOpenChange={onOpenChange} /> : null;
}

function ProfileEditBody({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const profile = useApp((s) => s.profile);
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(profile);
  const [skills, setSkills] = useState<string[]>(() => profile?.skills.map((s) => s.name) ?? []);

  if (!f) return null;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  const save = async () => {
    setBusy(true);
    const ok = await act(
      saveProfile({
        name: f.name,
        headline: f.headline,
        field: f.field,
        school: f.school,
        department: f.department,
        city: f.city,
        github: f.github,
        about: f.about,
        interests: f.interests,
        skills,
        education: f.school && !f.education.length ? [{ school: f.school, department: f.department, start: "", end: "" }] : f.education,
      }),
    );
    setBusy(false);
    if (!ok) return;
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
          <FieldPicker compact value={f.field} onChange={(v) => set("field", v)} />
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
        {profile && f.github === profile.github && <GithubVerify />}
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
          <button disabled={busy} className={btn("primary")}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
