import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { loadCompetition } from "@/lib/server/public";
import { Detail } from "./view";

export async function generateMetadata({ params }: PageProps<"/yarismalar/[id]">): Promise<Metadata> {
  const c = await loadCompetition((await params).id);
  return { title: c ? `${c.code} ${c.title}` : "Yarışma bulunamadı" };
}

export default async function Page({ params }: PageProps<"/yarismalar/[id]">) {
  const c = await loadCompetition((await params).id);
  return (
    <PageShell auth>
      <Detail c={c} />
    </PageShell>
  );
}
