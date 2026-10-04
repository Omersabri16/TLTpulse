"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Site geneli asistan. Gerçekte Gemini'ye gidecek; şimdilik sık sorulanlara hazır cevap.
const ANSWERS: { keys: string[]; answer: string }[] = [
  { keys: ["puan", "nasıl", "artır", "yüksel"], answer: "Puanın altı yerden gelir: projeler, yarışmalar, akran puanı, sertifikalar, amir/hoca onayları ve yol haritası adımları. Ayrıntısı 'Puanım' sayfasında." },
  { keys: ["proje", "ekle", "github"], answer: "Projeler sayfasında 'Proje ekle'ye bas, GitHub linkini yapıştır ve projeyi kısaca anlat. Sistem zorluğu ve kaliteyi analiz edip puanı hesaplar." },
  { keys: ["onay", "staj", "amir", "hoca", "referans"], answer: "Profilinde deneyiminin yanındaki 'Onay iste'ye bas, amirinin ya da hocanın e-postasını gir. Ona bir link gider; onaylar ve istersen yorum yazar." },
  { keys: ["yarışma", "takım", "başvur"], answer: "Yarışmalar sayfasında açık bir yarışma seç ve kendi alanındaki pozisyona başvur. Başvuru bitince sistem dengeli takımlar kurar." },
  { keys: ["sertifika", "btk", "credly"], answer: "BTK Akademi ve Credly sertifikaları otomatik doğrulanır. Profilinde 'Sertifika ekle' ile linki yapıştırman yeterli." },
  { keys: ["lig", "seviye"], answer: "Üç lig var: Yeni başlayan (0–59), Orta (60–79) ve Kıdemli (80+). Puanın arttıkça bir üst lige geçersin." },
];

export function Assistant() {
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([{ me: false, text: "Merhaba! TLTpulse hakkında ne sormak istersin?" }]);
  const [q, setQ] = useState("");

  const ask = (text: string) => {
    const t = text.toLocaleLowerCase("tr");
    const hit = ANSWERS.map((a) => ({ a, n: a.keys.filter((k) => t.includes(k)).length })).sort((x, y) => y.n - x.n)[0];
    const answer = hit && hit.n > 0 ? hit.a.answer : "Bunu tam anlayamadım. Puan, proje ekleme, onay, yarışma ya da sertifika hakkında sorabilirsin.";
    setLog((l) => [...l, { me: true, text }, { me: false, text: answer }]);
    setQ("");
  };

  return (
    <Sheet>
      <SheetTrigger className="no-print fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/60 hover:bg-primary/90">
        <Sparkles className="size-4" /> Pulse&apos;a sor
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="border-b bg-navy px-6 py-5 text-on-navy">
          <SheetTitle className="text-on-navy">Pulse asistanı</SheetTitle>
          <p className="text-xs text-on-navy-muted">Puan vermez, sadece yol gösterir.</p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {log.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.me ? "self-end bg-primary text-primary-foreground" : "bg-muted")}>
              {m.text}
            </div>
          ))}
          {log.length === 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {["Puanımı nasıl artırırım?", "Stajımı nasıl onaylatırım?", "Yarışmaya nasıl katılırım?"].map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q.trim());
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bir soru yaz…" className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Gönder">
            <Send className="size-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
