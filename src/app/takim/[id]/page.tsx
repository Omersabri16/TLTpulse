import { PageShell } from "@/components/page-shell";
import { loadTeam } from "@/lib/server/public";
import { TeamRoom } from "./view";

export const metadata = { title: "Takım" };

export default async function Page({ params }: PageProps<"/takim/[id]">) {
  const data = await loadTeam((await params).id);
  return (
    <PageShell auth>
      <TeamRoom data={data} />
    </PageShell>
  );
}
