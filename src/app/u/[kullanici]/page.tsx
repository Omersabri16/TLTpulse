import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { loadPublicProfile } from "@/lib/server/public";
import { PublicProfile } from "./view";

export async function generateMetadata({ params }: PageProps<"/u/[kullanici]">): Promise<Metadata> {
  const data = await loadPublicProfile((await params).kullanici);
  if (!data) return { title: "Profil bulunamadı" };
  // Paylaşılan profil linki X / LinkedIn'de lig kartıyla görünür (app/paylas).
  const image = `/paylas/${data.username}?bicim=yatay`;
  return {
    title: data.name,
    openGraph: { title: `${data.name} · TLTpulse`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function Page({ params }: PageProps<"/u/[kullanici]">) {
  const { kullanici } = await params;
  const data = await loadPublicProfile(kullanici);
  return (
    <PageShell>
      {data ? (
        <PublicProfile data={data} />
      ) : (
        <Container className="py-24 text-center">
          <h1 className="text-2xl font-semibold">Bu profil bulunamadı.</h1>
          <Link href="/lig" className={btn("primary", "md", "mt-6")}>
            Lige dön
          </Link>
        </Container>
      )}
    </PageShell>
  );
}
