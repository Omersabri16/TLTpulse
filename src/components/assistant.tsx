"use client";

import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { askAssistant } from "@/app/actions/assistant";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FAQ_FALLBACK, faqAnswer } from "@/lib/assistant-faq";
import { cn } from "@/lib/utils";

type Line = { me: boolean; text: string };

const GREETING: Line = { me: false, text: "Merhaba! Ben Pulse. Puanını, projelerini ya da hangi yarışmaya katılacağını sorabilirsin." };
const SUGGESTIONS = ["Puanımı nasıl artırırım?", "Profilimde ne eksik?", "Hangi yarışmaya başvurmalıyım?"];

/** Site geneli asistan: genel sorulara hazır cevap, kişiye özel sorulara Gemini (günlük sınırlı). */
export function Assistant() {
  const [log, setLog] = useState<Line[]>([GREETING]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [log.length, busy]);

  const ask = async (text: string) => {
    if (busy) return;
    const history = log.slice(1);
    setLog((l) => [...l, { me: true, text }]);
    setQ("");
    setBusy(true);
    let answer: string;
    try {
      const res = await askAssistant({ message: text, history });
      if (res.ok) {
        answer = res.data.answer;
        if (res.data.left !== null) setLeft(res.data.left);
      } else answer = res.error;
    } catch {
      answer = faqAnswer(text, { allowPersonal: true }) ?? FAQ_FALLBACK;
    }
    setBusy(false);
    setLog((l) => [...l, { me: false, text: answer }]);
  };

  return (
    <Sheet>
      <SheetTrigger className="no-print fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-6px] shadow-primary/60 hover:bg-primary/90">
        <Sparkles className="size-4" /> Pulse&apos;a sor
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="border-b bg-navy px-6 py-5 text-on-navy">
          <SheetTitle className="text-on-navy">Pulse asistanı</SheetTitle>
          <p className="text-xs text-on-navy-muted">
            Puan vermez, sadece yol gösterir.
            {left !== null && left <= 5 && ` Bugün ${left} kişisel soru hakkın kaldı.`}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5" aria-live="polite">
          {log.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line", m.me ? "self-end bg-primary text-primary-foreground" : "bg-muted")}>
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted px-4 py-3" aria-label="Pulse yazıyor">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
          {log.length === 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={end} />
        </div>
        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) void ask(q.trim());
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={500}
            placeholder="Bir soru yaz…"
            className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button disabled={busy || !q.trim()} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" aria-label="Gönder">
            <Send className="size-4" />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
