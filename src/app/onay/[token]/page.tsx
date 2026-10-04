"use client";

import { BadgeCheck, CircleX, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { UserAvatar } from "@/components/brand";
import { Card, Container, PageHero, PageShell } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import { isCorporateEmail } from "@/lib/score";
import { useApp, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Onaylayıcının e-postadaki linkle geldiği sayfa. Hesap gerektirmez.
 * Gerçekte token sunucuda doğrulanacak ve tek kullanımlık olacak.
 */
function Approve() {
  const { token } = useParams<{ token: string }>();
  const hydrated = useHydrated();
  const ref = useApp((s) => s.references.find((r) => r.token === token));
  const profile = useApp((s) => s.profile);
  const answer = useApp((s) => s.answerReference);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<null | boolean>(null);

  if (!hydrated) return <div className="grid flex-1 place-items-center py-32 text-sm text-muted-foreground">Yükleniyor…</div>;

  if (!ref || !profile)
    return (
      <Container className="max-w-xl py-24 text-center">
        <h1 className="text-2xl font-semibold">Bu onay linki geçersiz.</h1>
        <p className="mt-2 text-muted-foreground">Link süresi dolmuş ya da daha önce kullanılmış olabilir.</p>
      </Container>
    );

  const exp = ref.targetType === "experience" ? profile.experiences.find((e) => e.id === ref.targetId) : undefined;
  const answered = done !== null || ref.status !== "Bekliyor";

  return (
    <>
      <PageHero eyebrow="Onay isteği · TLTpulse" title={`${profile.name} senden`} highlight="onay istiyor." subtitle={`Merhaba ${ref.approverName}, seni ${ref.relation.toLowerCase()} olarak ekledi. Hesap açmana gerek yok.`} />
      <Container className="max-w-2xl">
        {answered ? (
          <Card className="p-8 text-center">
            {(done ?? ref.status === "Onaylandı") ? <BadgeCheck className="mx-auto size-12 text-ok" /> : <CircleX className="mx-auto size-12 text-muted-foreground" />}
            <h2 className="mt-4 text-2xl font-semibold">{(done ?? ref.status === "Onaylandı") ? "Teşekkürler, onayın kaydedildi." : "Yanıtın kaydedildi."}</h2>
            <p className="mt-2 text-muted-foreground">
              {(done ?? ref.status === "Onaylandı")
                ? `${profile.name} profilinde bu bilgi artık "Onaylı" görünüyor${ref.comment || comment ? ", yorumun da adınla birlikte yer alıyor" : ""}.`
                : `${profile.name} bilgilendirildi. Bu bilgi profilde onaylı görünmeyecek.`}
            </p>
            <Link href="/" className={btn("outline", "md", "mt-6")}>
              TLTpulse nedir?
            </Link>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <UserAvatar name={profile.name} className="size-14 text-lg" />
              <div>
                <b className="text-lg font-semibold">{profile.name}</b>
                <p className="text-sm text-muted-foreground">
                  {profile.headline}
                  {profile.school && ` · ${profile.school}`}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-muted p-5">
              <p className="text-xs tracking-wider text-muted-foreground uppercase">Onaylaman istenen</p>
              <p className="mt-2 text-lg font-semibold">{ref.targetLabel}</p>
              {exp && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {exp.kind} · {exp.start}
                  {exp.start && " – "}
                  {exp.end}
                </p>
              )}
              {exp?.description && <p className="mt-3 text-sm">{exp.description}</p>}
              <p className="mt-3 text-xs text-muted-foreground">İstek tarihi: {fmtDate(ref.requestedAt)}</p>
            </div>

            <label className="mt-6 grid gap-1.5 text-sm font-medium">
              Yorumun (isteğe bağlı)
              <textarea
                className={cn(inputClass, "h-auto min-h-28 py-3")}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`${profile.name.split(" ")[0]} ile çalışmak nasıldı? Ne yaptı?`}
              />
              <span className="text-xs font-normal text-muted-foreground">Yorumun profilinde &quot;Referanslar&quot; bölümünde adınla görünür. {comment.length}/500</span>
            </label>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              {isCorporateEmail(ref.approverEmail)
                ? `Kurum e-postan (${ref.approverEmail}) ile geldiğin için onayın tam ağırlıkla sayılır.`
                : `Kişisel e-posta (${ref.approverEmail}) ile geldiğin için onayın daha düşük ağırlıkla sayılır.`}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  answer(token, false);
                  setDone(false);
                }}
                className={btn("ghost", "lg")}
              >
                Bu bilgi doğru değil
              </button>
              <button
                onClick={() => {
                  answer(token, true, comment);
                  setDone(true);
                }}
                className={btn("primary", "lg")}
              >
                <BadgeCheck /> Onaylıyorum
              </button>
            </div>
          </Card>
        )}
      </Container>
    </>
  );
}

export default function Page() {
  return (
    <PageShell>
      <Approve />
    </PageShell>
  );
}
