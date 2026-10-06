"use client";

import { Check, Clock, MessageSquare, UserMinus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { answerConnection, cancelConnection, removeConnection, startConversation } from "@/app/actions/profile";
import { UserAvatar } from "@/components/brand";
import { Card, Container, PageHero, PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { useAct, useApp } from "@/lib/store";
import type { PersonRef } from "@/lib/types";

function Person({ p, children }: { p: PersonRef; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/u/${p.username}`} className="flex min-w-0 items-center gap-3 rounded-2xl hover:opacity-80">
        <UserAvatar name={p.name} />
        <span className="min-w-0 text-sm">
          <b className="block truncate font-semibold">{p.name}</b>
          <span className="text-muted-foreground">{p.field || `@${p.username}`}</span>
        </span>
      </Link>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </li>
  );
}

function Connections() {
  const profile = useApp((s) => s.profile);
  const people = useApp((s) => s.people);
  const req = useApp((s) => s.connectionRequests);
  const act = useAct();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const person = (u: string): PersonRef => people[u] ?? { username: u, name: u, field: "" };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    const ok = await fn();
    setBusy(null);
    return ok;
  };

  const connections = (profile?.connections ?? []).map(person);

  return (
    <>
      <PageHero eyebrow="Ağın" title="Bağlantılarım" subtitle="İstek gönderdiğin kişi kabul edince birbirinizin bağlantısı olursunuz." />
      <Container className="grid gap-6">
        {req.incoming.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Gelen istekler ({req.incoming.length})</h2>
            <ul className="divide-y">
              {req.incoming.map(person).map((p) => (
                <Person key={p.username} p={p}>
                  <button
                    disabled={busy === p.username}
                    onClick={() => run(p.username, async () => (await act(answerConnection(p.username, true))) && toast.success(`${p.name} ile bağlandınız`))}
                    className={btn("primary", "sm")}
                  >
                    <Check /> Kabul et
                  </button>
                  <button disabled={busy === p.username} onClick={() => run(p.username, () => act(answerConnection(p.username, false)))} className={btn("ghost", "sm")}>
                    <X /> Reddet
                  </button>
                </Person>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Bağlantılarım ({connections.length})</h2>
          {connections.length ? (
            <ul className="divide-y">
              {connections.map((p) => (
                <Person key={p.username} p={p}>
                  <button
                    onClick={async () => {
                      const res = await act(startConversation(p.username));
                      if (res) router.push(`/mesajlar?c=${res.id}`);
                    }}
                    className={btn("outline", "sm")}
                  >
                    <MessageSquare /> Mesaj
                  </button>
                  <button
                    disabled={busy === p.username}
                    onClick={() => run(p.username, async () => (await act(removeConnection(p.username))) && toast(`${p.name} bağlantılarından çıkarıldı`))}
                    className={btn("ghost", "sm")}
                    aria-label={`${p.name} bağlantısını kaldır`}
                  >
                    <UserMinus /> Kaldır
                  </button>
                </Person>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Henüz bağlantın yok. <Link href="/lig" className="font-semibold text-primary hover:underline">Ligdeki</Link> yazılımcıların profilinden ya da takım arkadaşlarına istek gönderebilirsin.
            </p>
          )}
        </Card>

        {req.outgoing.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Gönderdiğin istekler ({req.outgoing.length})</h2>
            <ul className="divide-y">
              {req.outgoing.map(person).map((p) => (
                <Person key={p.username} p={p}>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="size-4" /> Yanıt bekleniyor
                  </span>
                  <button disabled={busy === p.username} onClick={() => run(p.username, () => act(cancelConnection(p.username)))} className={btn("ghost", "sm")}>
                    Geri çek
                  </button>
                </Person>
              ))}
            </ul>
          </Card>
        )}
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Connections />
    </PageShell>
  );
}
