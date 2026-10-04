"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { connect, startConversation } from "@/app/actions/profile";
import { ProfileActionsOther, ProfileView, type ProfileData } from "@/components/profile-view";
import { useAct, useApp, useMyScore } from "@/lib/store";

export function PublicProfile({ data }: { data: ProfileData }) {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const myScore = useMyScore();
  const act = useAct();
  const router = useRouter();

  const isMe = session?.username === data.username;
  // Kendi profilin: düzenlenebilir sürüme git.
  useEffect(() => {
    if (isMe) router.replace("/profil");
  }, [isMe, router]);
  if (isMe) return null;

  const member = !!session;
  const connected = !!profile?.connections.includes(data.username);
  const needLogin = () => {
    toast("Bunun için giriş yapmalısın.");
    router.push(`/giris?next=/u/${data.username}`);
  };

  return (
    <ProfileView
      own={false}
      data={data}
      actions={
        <ProfileActionsOther
          username={data.username}
          connected={connected}
          onConnect={async () => {
            if (!member) return needLogin();
            if (await act(connect(data.username))) toast.success(`${data.name} bağlantılarına eklendi`);
          }}
          onMessage={async () => {
            if (!member) return needLogin();
            const res = await act(startConversation(data.username));
            if (res) router.push(`/mesajlar?c=${res.id}`);
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
