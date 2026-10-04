import { PageShell } from "@/components/page-shell";
import { loadLeague } from "@/lib/server/public";
import { League } from "./view";

export const metadata = { title: "Lig" };

export default async function Page() {
  const rows = await loadLeague();
  return (
    <PageShell>
      <League all={rows} />
    </PageShell>
  );
}
