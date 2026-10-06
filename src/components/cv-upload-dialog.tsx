"use client";

import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { applyCv, parseCv, type CvPreview } from "@/app/actions/cv";
import { Field, Modal } from "@/components/modal";
import { TagInput } from "@/components/tag-input";
import { btn, inputClass } from "@/lib/btn";
import { useAct } from "@/lib/store";
import type { MeData } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX = 4 * 1024 * 1024;

/** CV yükle → AI ayrıştırır → kullanıcı düzeltir → profile eklenir. Dosya saklanmaz. Pencere her açılışta temiz başlar. */
export function CvUploadDialog({ open, onOpenChange, onApplied }: { open: boolean; onOpenChange: (o: boolean) => void; onApplied?: (me: MeData) => void }) {
  return open ? <Body onOpenChange={onOpenChange} onApplied={onApplied} /> : null;
}

type Exp = { kind: "Staj" | "İş" | "Gönüllü"; title: string; org: string; start: string; end: string };
type Edu = { school: string; department: string; start: string; end: string };

function Body({ onOpenChange, onApplied }: { onOpenChange: (o: boolean) => void; onApplied?: (me: MeData) => void }) {
  const act = useAct();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"pick" | "reading" | "review">("pick");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);
  const [edu, setEdu] = useState<Edu[]>([]);
  const [about, setAbout] = useState("");
  const [useAbout, setUseAbout] = useState(true);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    if (file.size > MAX) return setErr("Dosya en fazla 4 MB olabilir.");
    if (!/\.(pdf|docx)$/i.test(file.name)) return setErr("Sadece PDF ya da Word (DOCX) dosyası yükleyebilirsin.");
    const fd = new FormData();
    fd.append("cv", file);
    setPhase("reading");
    // Hata metni sunucudan gelir (kullanıcıya uygun); burada gösterilir, ayrıca bildirim çıkmaz.
    let r: Awaited<ReturnType<typeof parseCv>>;
    try {
      r = await parseCv(fd);
    } catch {
      r = { ok: false, error: "Sunucuya ulaşılamadı. Bağlantını kontrol et." };
    }
    if (!r.ok) {
      setPhase("pick");
      return setErr(r.error);
    }
    fill(r.data);
  };

  const fill = (p: CvPreview) => {
    setSkills(p.beceriler);
    setExps(p.deneyimler.map((d) => ({ kind: d.tur, title: d.rol, org: d.kurum, start: d.baslangic, end: d.bitis })));
    setEdu(p.egitim.map((e) => ({ school: e.okul, department: e.bolum, start: e.baslangic, end: e.bitis })));
    setAbout(p.hakkinda);
    setPhase("review");
  };

  const save = async () => {
    setBusy(true);
    const me = await act(applyCv({ skills, experiences: exps.filter((e) => e.title.trim().length >= 2 && e.org.trim().length >= 2), education: edu.filter((e) => e.school.trim().length >= 2), about: useAbout ? about : undefined }));
    setBusy(false);
    if (!me) return;
    toast.success("CV'deki bilgiler profiline eklendi", { description: "Beceriler proje ekleyene kadar \"beyan\" olarak görünür." });
    onApplied?.(me);
    onOpenChange(false);
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={phase === "review" ? "CV'nden çıkardıklarımız" : "CV'mi yükle"}
      description={phase === "review" ? "Kontrol et, düzelt, onayla. Hiçbir şey sen onaylamadan kaydedilmez." : "PDF ya da Word (en fazla 4 MB). Dosyan saklanmaz; sadece metni okunup atılır."}
      className="sm:max-w-2xl"
    >
      {phase === "pick" && (
        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
            className="grid place-items-center gap-3 rounded-3xl border border-dashed p-10 text-center transition hover:border-primary hover:bg-muted"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <Upload className="size-6" />
            </span>
            <b>Dosya seç ya da buraya sürükle</b>
            <span className="text-xs text-muted-foreground">AI becerilerini, deneyimlerini ve eğitimini çıkarır.</span>
          </button>
          <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          {err && (
            <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
              {err}{" "}
              <Link href="/profil?duzenle=1" onClick={() => onOpenChange(false)} className="font-semibold underline">
                Elle doldur
              </Link>
            </div>
          )}
        </div>
      )}

      {phase === "reading" && (
        <div className="grid place-items-center gap-3 py-10 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="size-6 animate-spin text-primary" />
          CV okunuyor, AI bilgileri çıkarıyor…
        </div>
      )}

      {phase === "review" && (
        <div className="grid gap-5">
          <Field label="Beceriler" hint="Proje ekledikçe kodla kanıtlananlar ✓ alır.">
            <TagInput value={skills} onChange={setSkills} placeholder="Ekle ve Enter'a bas" />
          </Field>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Deneyimler</span>
            {exps.length === 0 && <p className="text-xs text-muted-foreground">CV&apos;de deneyim bulunamadı.</p>}
            {exps.map((e, i) => (
              <div key={i} className="grid gap-2 rounded-2xl border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input className={inputClass} value={e.title} onChange={(ev) => setExps(exps.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} aria-label="Unvan" />
                <input className={inputClass} value={e.org} onChange={(ev) => setExps(exps.map((x, j) => (j === i ? { ...x, org: ev.target.value } : x)))} aria-label="Kurum" />
                <button type="button" onClick={() => setExps(exps.filter((_, j) => j !== i))} className={btn("ghost", "md", "text-destructive")} aria-label="Kaldır">
                  <Trash2 />
                </button>
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  {e.kind} · {e.start || "?"} – {e.end || "?"}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Eğitim</span>
            {edu.length === 0 && <p className="text-xs text-muted-foreground">CV&apos;de eğitim bilgisi bulunamadı.</p>}
            {edu.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border p-3 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <b>{e.school}</b> · {e.department} <span className="text-muted-foreground">{[e.start, e.end].filter(Boolean).join("–")}</span>
                </span>
                <button type="button" onClick={() => setEdu(edu.filter((_, j) => j !== i))} className={btn("ghost", "md", "text-destructive")} aria-label="Kaldır">
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>

          {about && (
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={useAbout} onChange={(e) => setUseAbout(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                &quot;Hakkında&quot; bölümüne ekle (boşsa)
              </label>
              <textarea className={cn(inputClass, "h-auto min-h-20 py-3", !useAbout && "opacity-50")} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={1000} />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5" /> AI çıkardı, sen onaylıyorsun
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPhase("pick")} className={btn("ghost")}>
                Başka dosya
              </button>
              <button type="button" onClick={save} disabled={busy} className={btn("primary")}>
                {busy ? "Ekleniyor…" : "Profilime ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
