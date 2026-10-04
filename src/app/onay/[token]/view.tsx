"use client";

import { BadgeCheck, CircleX, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { answerApproval } from "@/app/actions/approvals";
import { UserAvatar } from "@/components/brand";
import { Card, Container, PageHero } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { fmtDate } from "@/lib/competitions";
import type { ApprovalView } from "@/lib/server/approval";
import { useAct } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Approve({ token, view }: { token: string; view: ApprovalView }) {
  const act = useAct();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | boolean>(view.status === "Bekliyor" ? null : view.status === "Onaylandı");
  const user = view.user;

  const answer = async (approve: boolean) => {
    setBusy(true);
    const res = await act(answerApproval({ token, approve, comment: approve ? comment : undefined }));
    setBusy(false);
    if (res) setDone(res.approved);
  };

  return (
    <>
      <PageHero
        eyebrow="Onay isteği · TLTpulse"
        title={`${user.name} senden`}
        highlight="onay istiyor."
        subtitle={`Merhaba ${view.approverName}, seni ${view.relation.toLowerCase()} olarak ekledi. Hesap açmana gerek yok.`}
      />
      <Container className="max-w-2xl">
        {done !== null ? (
          <Card className="p-8 text-center">
            {done ? <BadgeCheck className="mx-auto size-12 text-ok" /> : <CircleX className="mx-auto size-12 text-muted-foreground" />}
            <h2 className="mt-4 text-2xl font-semibold">{done ? "Teşekkürler, onayın kaydedildi." : "Yanıtın kaydedildi."}</h2>
            <p className="mt-2 text-muted-foreground">
              {done
                ? `${user.name} profilinde bu bilgi artık "Onaylı" görünüyor${view.comment || comment ? ", yorumun da adınla birlikte yer alıyor" : ""}.`
                : `${user.name} bilgilendirildi. Bu bilgi profilde onaylı görünmeyecek.`}
            </p>
            <Link href="/" className={btn("outline", "md", "mt-6")}>
              TLTpulse nedir?
            </Link>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <UserAvatar name={user.name} className="size-14 text-lg" />
              <div>
                <b className="text-lg font-semibold">{user.name}</b>
                <p className="text-sm text-muted-foreground">
                  {user.headline}
                  {user.school && ` · ${user.school}`}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-muted p-5">
              <p className="text-xs tracking-wider text-muted-foreground uppercase">Onaylaman istenen</p>
              <p className="mt-2 text-lg font-semibold">{view.targetLabel}</p>
              {view.targetDetail && <p className="mt-1 text-sm text-muted-foreground">{view.targetDetail}</p>}
              <p className="mt-3 text-xs text-muted-foreground">İstek tarihi: {fmtDate(view.requestedAt)}</p>
            </div>

            <label className="mt-6 grid gap-1.5 text-sm font-medium">
              Yorumun (isteğe bağlı)
              <textarea
                className={cn(inputClass, "h-auto min-h-28 py-3")}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`${user.name.split(" ")[0]} ile çalışmak nasıldı? Ne yaptı?`}
              />
              <span className="text-xs font-normal text-muted-foreground">Yorumun profilinde &quot;Referanslar&quot; bölümünde adınla görünür. {comment.length}/500</span>
            </label>

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              {view.corporate
                ? `Kurum e-postan (@${view.approverDomain}) ile geldiğin için onayın tam ağırlıkla sayılır.`
                : `Kişisel e-posta (@${view.approverDomain}) ile geldiğin için onayın daha düşük ağırlıkla sayılır.`}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button disabled={busy} onClick={() => answer(false)} className={btn("ghost", "lg")}>
                Bu bilgi doğru değil
              </button>
              <button disabled={busy} onClick={() => answer(true)} className={btn("primary", "lg")}>
                <BadgeCheck /> {busy ? "Kaydediliyor…" : "Onaylıyorum"}
              </button>
            </div>
          </Card>
        )}
      </Container>
    </>
  );
}
