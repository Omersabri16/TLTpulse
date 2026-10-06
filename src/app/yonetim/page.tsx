import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { loadAdmin } from "@/lib/server/admin-data";
import { isAdmin } from "@/lib/server/auth";
import { SPEC_BANK } from "@/lib/spec-bank";
import { AdminView } from "./view";

export const metadata = { title: "Yönetim", robots: { index: false } };

/** Sadece yönetici: diğerleri için sayfa yokmuş gibi (404). Her aksiyon sunucuda ayrıca requireAdmin ile kontrol edilir. */
export default async function Page() {
  if (!(await isAdmin())) notFound();
  const data = await loadAdmin();
  return (
    <PageShell auth>
      <AdminView data={data} bank={SPEC_BANK.map((s) => ({ id: s.id, title: s.title, tagline: s.tagline, difficulty: s.difficulty, applyDays: s.applyDays, buildDays: s.buildDays, hiddenCount: s.hiddenCount, publicCount: s.publicTests.length }))} />
    </PageShell>
  );
}
