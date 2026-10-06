"use client";

import { Download, ShieldOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAccount, exportMyData, unblockUser } from "@/app/actions/account";
import { Field, Modal } from "@/components/modal";
import { Card, Container, PageHero, PageShell } from "@/components/page-shell";
import { btn, inputClass } from "@/lib/btn";
import { useAct, useApp } from "@/lib/store";

function Account() {
  const profile = useApp((s) => s.profile)!;
  const blocked = useApp((s) => s.blocked);
  const people = useApp((s) => s.people);
  const act = useAct();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [del, setDel] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const download = async () => {
    setBusy("indir");
    const data = await act(exportMyData());
    setBusy("");
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tltpulse-${profile.username}-verilerim.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHero eyebrow="Hesap" title="Hesap ve" highlight="gizlilik." subtitle="Verilerin senin. İndir, engelle ya da hesabını tamamen sil." />
      <Container className="grid max-w-3xl gap-6">
        <Card>
          <h2 className="text-lg font-semibold">Verilerimi indir</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Profilin, projelerin, onayların, mesajların, puan geçmişin ve diğer bütün kayıtların tek bir JSON dosyasında (KVKK m. 11). Günde 3 kez.
          </p>
          <button onClick={download} disabled={busy === "indir"} className={btn("outline", "md", "mt-4")}>
            <Download /> {busy === "indir" ? "Hazırlanıyor…" : "JSON olarak indir"}
          </button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Engellediklerin</h2>
          {blocked.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Kimseyi engellemedin. Bir profilde ya da sohbette ⋯ menüsünden engelleyebilirsin.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {blocked.map((u) => (
                <li key={u} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm font-medium">{people[u]?.name ?? u}</span>
                  <button
                    onClick={async () => {
                      if (await act(unblockUser(u))) toast("Engel kaldırıldı");
                    }}
                    className={btn("ghost", "sm")}
                  >
                    <ShieldOff /> Engeli kaldır
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Gizlilik</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hangi verinin neden işlendiğini, kimlerle paylaşıldığını ve haklarını{" "}
            <Link href="/gizlilik" className="font-semibold text-primary hover:underline">
              aydınlatma metninde
            </Link>{" "}
            bulabilirsin.
          </p>
        </Card>

        <Card className="border-destructive/40">
          <h2 className="text-lg font-semibold text-destructive">Hesabımı sil</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Profilin, projelerin (dosya özetleri dahil), onayların, sertifikaların, mesajların ve puan geçmişin kalıcı olarak silinir. Takım sohbetlerindeki mesajların &quot;Silinmiş kullanıcı&quot; adıyla kalır. Geri alınamaz.
          </p>
          <button onClick={() => setDel(true)} className={btn("outline", "md", "mt-4 border-destructive text-destructive hover:bg-destructive/10")}>
            <Trash2 /> Hesabımı sil
          </button>
        </Card>
      </Container>

      <Modal open={del} onOpenChange={setDel} title="Hesabını silmek istediğine emin misin?" description="Bu işlem geri alınamaz.">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy("sil");
            const ok = await act(deleteAccount({ password: pw || undefined, confirm }));
            setBusy("");
            if (!ok) return;
            toast("Hesabın silindi. Hoşça kal!");
            router.push("/");
            router.refresh();
          }}
        >
          <Field label="Şifren" hint="Google ile giriş yaptıysan boş bırak.">
            <input className={inputClass} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label='Onaylamak için "SİL" yaz'>
            <input className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SİL" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDel(false)} className={btn("ghost")}>
              Vazgeç
            </button>
            <button disabled={busy === "sil" || confirm.toLocaleUpperCase("tr") !== "SİL"} className={btn("primary", "md", "bg-destructive hover:bg-destructive/90")}>
              {busy === "sil" ? "Siliniyor…" : "Kalıcı olarak sil"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Account />
    </PageShell>
  );
}
