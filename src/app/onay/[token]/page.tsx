import { Container, PageShell } from "@/components/page-shell";
import { approvalByToken } from "@/lib/server/approval";
import { Approve } from "./view";

export const metadata = { title: "Onay isteği", robots: { index: false, follow: false } };

/** Onaylayıcının e-postadaki linkle geldiği sayfa. Hesap gerektirmez; yetki tek kullanımlık token. */
export default async function Page({ params }: PageProps<"/onay/[token]">) {
  const { token } = await params;
  const view = await approvalByToken(token);
  return (
    <PageShell>
      {view && !(view.status === "Bekliyor" && view.expired) ? (
        <Approve token={token} view={view} />
      ) : (
        <Container className="max-w-xl py-24 text-center">
          <h1 className="text-2xl font-semibold">Bu onay linki geçersiz.</h1>
          <p className="mt-2 text-muted-foreground">Link süresi dolmuş, yanlış kopyalanmış ya da daha önce kullanılmış olabilir.</p>
        </Container>
      )}
    </PageShell>
  );
}
