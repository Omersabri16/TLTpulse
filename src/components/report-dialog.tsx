"use client";

import { useState } from "react";
import { toast } from "sonner";
import { reportContent } from "@/app/actions/account";
import { Field, Modal } from "@/components/modal";
import { btn, inputClass } from "@/lib/btn";
import { useAct } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface ReportTarget {
  type: "Profil" | "Mesaj" | "Proje";
  id: string;
  username: string;
  label: string;
}

/** Şikayet et: profil, mesaj ya da proje. Yönetici sayfasında listelenir. */
export function ReportDialog({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  return target ? <Body target={target} onClose={onClose} /> : null;
}

function Body({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const act = useAct();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Şikayet et" description={`${target.type}: ${target.label}. Şikayetin ekibimize gider; kimseyle paylaşılmaz.`}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await act(reportContent({ targetType: target.type, targetId: target.id, username: target.username, reason }));
          setBusy(false);
          if (!ok) return;
          toast.success("Şikayetin alındı", { description: "İnceleyip gerekirse hesabı askıya alacağız." });
          onClose();
        }}
      >
        <Field label="Sebep">
          <textarea className={cn(inputClass, "h-auto min-h-24 py-3")} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ör. başkasının projesini kendi projesi gibi eklemiş." required />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn("ghost")}>
            Vazgeç
          </button>
          <button disabled={busy || reason.trim().length < 3} className={btn("primary")}>
            {busy ? "Gönderiliyor…" : "Gönder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
