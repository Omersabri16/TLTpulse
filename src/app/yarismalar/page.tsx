import { PageShell } from "@/components/page-shell";
import { loadCompetitions } from "@/lib/server/public";
import { Competitions } from "./view";

export const metadata = { title: "Yarışmalar" };

export default async function Page() {
  return (
    <PageShell auth>
      <Competitions all={await loadCompetitions()} />
    </PageShell>
  );
}
