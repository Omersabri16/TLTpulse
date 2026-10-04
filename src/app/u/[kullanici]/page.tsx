"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Container, PageShell } from "@/components/page-shell";
import { ProfileActionsOther, ProfileView } from "@/components/profile-view";
import { btn } from "@/lib/btn";
import { publicData } from "@/lib/public-profile";
import { useApp, useHydrated, useMyScore } from "@/lib/store";

function PublicProfile() {
  const { kullanici } = useParams<{ kullanici: string }>();
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const startConversation = useApp((s) => s.startConversation);
  const myScore = useMyScore();
  const router = useRouter();

  const isMe = hydrated && session?.username === kullanici;
  const data = publicData(kullanici);

  // Kendi profilin: düzenlenebilir sürüme git.
  useEffect(() => {
    if (isMe) router.replace("/profil");
  }, [isMe, router]);

  if (isMe) return null;
  if (!data)
    return (
      <Container className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Bu profil bulunamadı.</h1>
        <Link href="/lig" className={btn("primary", "md", "mt-6")}>
          Lige dön
        </Link>
      </Container>
    );

  const member = hydrated && !!session;
  const connected = !!profile?.connections.includes(kullanici);
  const needLogin = () => {
    toast("Bunun için giriş yapmalısın.");
    router.push(`/giris?next=/u/${kullanici}`);
  };

  return (
    <ProfileView
      own={false}
      data={data}
      actions={
        <ProfileActionsOther
          username={kullanici}
          connected={connected}
          onConnect={() => {
            if (!member || !profile) return needLogin();
            updateProfile({ connections: [...profile.connections, kullanici] });
            toast.success(`${data.name} bağlantılarına eklendi`);
          }}
          onMessage={() => {
            if (!member) return needLogin();
            router.push(`/mesajlar?c=${startConversation(kullanici)}`);
          }}
        />
      }
      sidebarTop={
        member && profile ? (
          <div className="rounded-3xl border bg-card p-6 text-sm">
            <p className="text-muted-foreground">Senin puanın</p>
            <p className="mt-1 text-2xl font-semibold">
              {myScore.total} <span className="text-sm font-normal text-muted-foreground">· {data.score > myScore.total ? `${data.score - myScore.total} puan geridesin` : "öndesin"}</span>
            </p>
          </div>
        ) : null
      }
    />
  );
}

export default function Page() {
  return (
    <PageShell>
      <PublicProfile />
    </PageShell>
  );
}
