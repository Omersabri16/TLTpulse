import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";
import { loadPublicProfile } from "@/lib/server/public";
import { PublicProfile } from "./view";

export async function generateMetadata({ params }: PageProps<"/u/[kullanici]">): Promise<Metadata> {
  const data = await loadPublicProfile((await params).kullanici);
  return { title: data ? data.name : "Profil bulunamadı" };
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
