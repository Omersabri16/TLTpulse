import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { btn } from "@/lib/btn";

export default function NotFound() {
  return (
    <PageShell>
      <section className="flex flex-1 flex-col items-center justify-center bg-navy px-4 py-28 text-center text-on-navy">
        <p className="text-7xl font-semibold text-cyan">404</p>
        <h1 className="mt-4 text-3xl font-semibold">Burada nabız yok.</h1>
        <p className="mt-2 text-on-navy-muted">Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <Link href="/" className={btn("primary", "lg", "mt-8")}>
          Ana sayfaya dön
        </Link>
      </section>
    </PageShell>
  );
}
