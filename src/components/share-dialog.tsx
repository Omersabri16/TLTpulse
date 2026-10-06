"use client";

import { Download, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal";
import { Segmented } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { useIsClient } from "@/lib/store";
import { cn } from "@/lib/utils";

type Format = "kare" | "hikaye" | "yatay";
const FORMATS: { value: Format; label: string }[] = [
  { value: "kare", label: "Gönderi (kare)" },
  { value: "hikaye", label: "Hikaye" },
  { value: "yatay", label: "X / LinkedIn" },
];

/**
 * Lig atlama başarısını paylaşma. Görsel sunucuda üretilir (/paylas/<kullanıcı>). X ve LinkedIn'in paylaşım linki var;
 * Instagram'ın web'den paylaşım linki olmadığı için telefonda paylaşım menüsü (Instagram dahil) açılır, bilgisayarda görsel iner.
 */
export function ShareDialog({ open, onOpenChange, username, headline }: { open: boolean; onOpenChange: (o: boolean) => void; username: string; headline: string }) {
  const [format, setFormat] = useState<Format>("kare");
  const [busy, setBusy] = useState(false);
  const origin = useIsClient() ? window.location.origin : "";
  const profileUrl = `${origin}/u/${username}`;
  const image = `/paylas/${username}?bicim=${format}`;
  const text = `TLTpulse'ta ${headline.toLocaleLowerCase("tr")}! Projelerimle ve yarışmalarla kazandım.`;

  const file = async () => {
    const res = await fetch(image);
    if (!res.ok) throw new Error("görsel");
    return new File([await res.blob()], `tltpulse-${username}-${format}.png`, { type: "image/png" });
  };
  const download = async () => {
    const f = await file();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const instagram = async () => {
    setBusy(true);
    try {
      const f = await file();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: `${text} ${profileUrl}` });
      } else {
        await download();
        toast.success("Görsel indirildi", { description: "Instagram'da gönderi ya da hikaye olarak yükle; linkini de ekleyebilirsin." });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error("Görsel hazırlanamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Başarını paylaş" description={headline} className="sm:max-w-2xl">
      <div className="grid gap-5">
        <Segmented value={format} onChange={setFormat} options={FORMATS} />
        <div className="grid place-items-center rounded-2xl bg-muted p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Paylaşım görseli" className={cn("rounded-xl shadow-sm", format === "hikaye" ? "max-h-96" : format === "kare" ? "max-h-80" : "w-full")} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={instagram} className={btn("primary")}>
            <Share2 /> Instagram&apos;da paylaş
          </button>
          <a href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" className={btn("outline")}>
            X&apos;te paylaş
          </a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" className={btn("outline")}>
            LinkedIn
          </a>
          <button onClick={() => download().catch(() => toast.error("Görsel indirilemedi."))} className={btn("ghost")}>
            <Download /> İndir
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(profileUrl).then(() => toast.success("Profil linki kopyalandı"), () => toast.error("Kopyalanamadı"))}
            className={btn("ghost")}
          >
            <Link2 /> Linki kopyala
          </button>
        </div>
        <p className="text-xs text-muted-foreground">X ve LinkedIn&apos;de paylaşılan profil linki bu kartla görünür. Instagram için telefonda paylaşım menüsü açılır; bilgisayarda görsel iner.</p>
      </div>
    </Modal>
  );
}
