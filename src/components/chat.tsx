"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/brand";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  mine: boolean;
  author?: string;
  text: string;
  at: string;
}

/** Mesajlar ve takım sohbeti için ortak sohbet akışı. */
export function ChatThread({ messages, onSend, placeholder = "Bir mesaj yaz…", showAuthors = false, empty }: { messages: ChatMessage[]; onSend: (t: string) => Promise<boolean>; placeholder?: string; showAuthors?: boolean; empty?: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  // Süslü parantez şart: yeni tarayıcılarda scrollIntoView Promise döndürüyor, effect bir şey döndürmemeli.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5 sm:p-6" aria-live="polite">
        {messages.length === 0 && <p className="m-auto text-sm text-muted-foreground">{empty ?? "Henüz mesaj yok. İlk mesajı sen yaz."}</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex max-w-[80%] items-end gap-2", m.mine ? "self-end" : "self-start")}>
            {showAuthors && !m.mine && m.author && <UserAvatar name={m.author} className="size-7 text-[10px]" />}
            <div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed", m.mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>
              {showAuthors && !m.mine && m.author && <b className="mb-0.5 block text-xs">{m.author}</b>}
              {m.text}
              <span className={cn("mt-1 block text-[10px]", m.mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.at}</span>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || sending) return;
          setSending(true);
          const ok = await onSend(text.trim());
          setSending(false);
          if (ok) setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="h-11 flex-1 rounded-full bg-muted px-5 text-sm outline-none focus:ring-3 focus:ring-ring/30" aria-label="Mesaj" />
        <button className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" disabled={!text.trim() || sending} aria-label="Gönder">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
