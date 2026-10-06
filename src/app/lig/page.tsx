import { PageShell } from "@/components/page-shell";
import { loadLeague } from "@/lib/server/public";
import { openSeason } from "@/lib/server/season";
import { League } from "./view";

export const metadata = { title: "Lig" };

export default async function Page() {
  const [rows, season] = await Promise.all([loadLeague(), openSeason()]);
  return (
    <PageShell>
      <League all={rows} season={season} />
    </PageShell>
  );
}
