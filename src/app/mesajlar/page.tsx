"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { UserAvatar } from "@/components/brand";
import { ChatThread } from "@/components/chat";
import { Container, PageHero, PageShell } from "@/components/page-shell";
import { sendMessage } from "@/app/actions/competitions";
import { useAct, useApp } from "@/lib/store";
import { fmtClock } from "@/lib/time";
import { cn } from "@/lib/utils";

function Messages() {
  const conversations = useApp((s) => s.conversations);
  const people = useApp((s) => s.people);
  const append = useApp((s) => s.appendMessage);
  const act = useAct();
  const params = useSearchParams();
  const [active, setActive] = useState<string | null>(params.get("c") ?? conversations[0]?.id ?? null);
  const [mobileThread, setMobileThread] = useState(!!params.get("c"));
  const [q, setQ] = useState("");

  const list = conversations
    .map((c) => ({ ...c, person: people[c.with] ?? { username: c.with, name: c.with, field: "" } }))
    .filter((c) => !q || c.person.name.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
  const current = list.find((c) => c.id === active) ?? list[0];

  return (
    <>
      <PageHero eyebrow="Bağlantıda kal" title="Mesajlar" />
      <Container>
        <div className="grid h-[600px] overflow-hidden rounded-3xl border bg-card md:grid-cols-[300px_1fr]">
          <aside className={cn("flex min-h-0 flex-col border-r", mobileThread && "hidden md:flex")}>
            <div className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bağlantı ara" className="h-11 w-full rounded-full border bg-card pr-4 pl-10 text-sm outline-none focus:ring-3 focus:ring-ring/30" />
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {list.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground">Henüz mesajın yok. Bir profilden &quot;Mesaj gönder&quot; ile başla.</li>}
              {list.map((c) => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        setActive(c.id);
                        setMobileThread(true);
                      }}
                      className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left transition", current?.id === c.id ? "bg-secondary" : "hover:bg-muted")}
                    >
                      <UserAvatar name={c.person.name} className="size-12" />
                      <span className="min-w-0">
                        <b className="block text-sm font-semibold">{c.person.name}</b>
                        <span className="block truncate text-xs text-muted-foreground">{last ? `${last.from === "me" ? "Sen: " : ""}${last.text}` : "Yeni sohbet"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className={cn("flex min-h-0 flex-col", !mobileThread && "hidden md:flex")}>
            {current ? (
              <>
                <header className="flex items-center gap-3 border-b px-5 py-4">
                  <button onClick={() => setMobileThread(false)} className="md:hidden" aria-label="Geri">
                    <ArrowLeft className="size-5" />
                  </button>
                  <UserAvatar name={current.person.name} className="size-9 text-xs" />
                  <div className="text-sm">
                    <Link href={`/u/${current.with}`} className="font-semibold hover:underline">
                      {current.person.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{current.person.field} · Bağlantın</p>
                  </div>
                </header>
                <ChatThread
                  messages={current.messages.map((m) => ({ id: m.id, mine: m.from === "me", text: m.text, at: m.at }))}
                  onSend={async (t) => {
                    const res = await act(sendMessage({ conversationId: current.id, text: t }));
                    if (res) append(current.id, { id: res.id, from: "me", text: t, at: fmtClock(res.at) });
                    return !!res;
                  }}
                />
              </>
            ) : (
              <p className="m-auto text-sm text-muted-foreground">Bir sohbet seç.</p>
            )}
          </section>
        </div>
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Suspense>
        <Messages />
      </Suspense>
    </PageShell>
  );
}
