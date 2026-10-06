import { BadgeCheck, CircleX } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/brand";
import { Card, Container, PageHero, PageShell, Pill } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import type { ProfileData } from "@/components/profile-view";
import { levelLabel } from "@/lib/score";
import { loadPublicProfile, usernameByCvCode } from "@/lib/server/public";

/** QR'ın götürdüğü sayfa: CV'deki bilgiler gerçek mi? (kararlar.md Bölüm 7) */
function Verify({ kod, data }: { kod: string; data: ProfileData | null }) {
  if (!data)
    return (
      <>
        <PageHero eyebrow="CV doğrulama" title="Kod" highlight="bulunamadı." />
        <Container className="max-w-2xl">
          <Card className="flex gap-4 p-6">
            <CircleX className="size-6 shrink-0 text-destructive" />
            <p className="text-sm">
              <b className="font-mono">{kod}</b> koduyla oluşturulmuş bir CV yok. CV elle değiştirilmiş ya da kod yanlış yazılmış olabilir.
            </p>
          </Card>
        </Container>
      </>
    );

  const approvedExps = data.references.filter((r) => r.status === "Onaylandı");
  const verifiedCerts = data.certs.filter((c) => c.status === "Doğrulandı");
  const declared = data.skills.filter((s) => s.proof === "Beyan");

  return (
    <>
      <PageHero eyebrow={`CV doğrulama · ${kod.toUpperCase()}`} title="Bu CV" highlight="gerçek." subtitle="Aşağıdaki bilgiler TLTpulse'taki kanıtlardan geliyor; PDF'teki bilgilerle karşılaştırabilirsiniz." />
      <Container className="grid max-w-4xl gap-6">
        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={data.name} className="size-14 text-lg" />
            <div>
              <b className="text-lg font-semibold">{data.name}</b>
              <p className="text-sm text-muted-foreground">
                {data.headline} · {data.school}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="lav">{levelLabel(data.level)}</Pill>
            <Pill tone="ok">{data.total} puan</Pill>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Kanıtlar</h2>
          <ul className="grid gap-3 text-sm">
            <Item ok text={`${data.projects.length} proje, commit yazarlığı GitHub'dan doğrulandı`} />
            <Item ok={approvedExps.length > 0} text={approvedExps.length ? `${approvedExps.length} deneyim üçüncü kişi tarafından onaylandı (${approvedExps.map((r) => "@" + r.approverEmail.split("@")[1]).join(", ")})` : "Onaylı deneyim yok"} />
            <Item ok={data.competitions.length > 0} text={data.competitions.length ? `${data.competitions.length} yarışma teslimi (tarih damgalı)` : "Yarışma teslimi yok"} />
            <Item ok={verifiedCerts.length > 0} text={verifiedCerts.length ? `${verifiedCerts.length} sertifika resmi kaynaktan doğrulandı` : "Doğrulanmış sertifika yok"} />
          </ul>
        </Card>

        {declared.length > 0 && (
          <Card>
            <h2 className="mb-2 font-semibold">Kanıtı olmayan beceriler</h2>
            <p className="mb-4 text-sm text-muted-foreground">Bunlar doğrulanmış CV&apos;de yer almaz. PDF&apos;te görüyorsanız sonradan eklenmiştir.</p>
            <div className="flex flex-wrap gap-2">
              {declared.map((s) => (
                <Pill key={s.name} tone="muted">
                  {s.name}
                </Pill>
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`/u/${data.username}`} className={btn("primary")}>
            Güncel profili gör
          </Link>
          <Link href={`/u/${data.username}/cv`} className={btn("outline")}>
            CV&apos;yi aç
          </Link>
        </div>
      </Container>
    </>
  );
}

function Item({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? <BadgeCheck className="mt-0.5 size-4 shrink-0 text-ok" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <span className={ok ? "" : "text-muted-foreground"}>{text}</span>
    </li>
  );
}

export const metadata = { title: "CV doğrulama", robots: { index: false } };

export default async function Page({ params }: PageProps<"/dogrula/[kod]">) {
  const kod = decodeURIComponent((await params).kod).toUpperCase().slice(0, 20);
  const username = await usernameByCvCode(kod);
  const data = username ? await loadPublicProfile(username) : null;
  return (
    <PageShell>
      <Verify kod={kod} data={data} />
    </PageShell>
  );
}
