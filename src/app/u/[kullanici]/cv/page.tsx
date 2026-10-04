import type { Metadata } from "next";
import { Container, PageShell } from "@/components/page-shell";
import { loadPublicProfile } from "@/lib/server/public";
import { Cv } from "./view";

export async function generateMetadata({ params }: PageProps<"/u/[kullanici]/cv">): Promise<Metadata> {
  const data = await loadPublicProfile((await params).kullanici);
  return { title: data ? `${data.name} · Doğrulanmış CV` : "CV bulunamadı" };
}

/** Sadece kanıtlı bilgilerden oluşan, QR ile doğrulanabilen CV (kararlar.md Bölüm 7). */
export default async function Page({ params }: PageProps<"/u/[kullanici]/cv">) {
  const data = await loadPublicProfile((await params).kullanici);
  return <PageShell>{data ? <Cv data={data} /> : <Container className="py-24 text-center text-xl font-semibold">Profil bulunamadı.</Container>}</PageShell>;
}
