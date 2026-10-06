"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { blockUser, unblockUser } from "@/app/actions/account";
import { connect, startConversation } from "@/app/actions/profile";
import { ProfileActionsOther, ProfileView, type ProfileData } from "@/components/profile-view";
import { ReportDialog, type ReportTarget } from "@/components/report-dialog";
import { useAct, useApp, useMyScore } from "@/lib/store";

export function PublicProfile({ data }: { data: ProfileData }) {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const blocked = useApp((s) => s.blocked);
  const myScore = useMyScore();
  const act = useAct();
  const router = useRouter();
  const [report, setReport] = useState<ReportTarget | null>(null);

  const isMe = session?.username === data.username;
  // Kendi profilin: düzenlenebilir sürüme git.
  useEffect(() => {
    if (isMe) router.replace("/profil");
  }, [isMe, router]);
  if (isMe) return null;

  const member = !!session;
  const connected = !!profile?.connections.includes(data.username);
  const isBlocked = blocked.includes(data.username);
  const needLogin = () => {
    toast("Bunun için giriş yapmalısın.");
    router.push(`/giris?next=/u/${data.username}`);
  };

  return (
    <>
      <ProfileView
        own={false}
        data={data}
        onReportProject={member ? (id, name) => setReport({ type: "Proje", id, username: data.username, label: name }) : undefined}
        actions={
          <ProfileActionsOther
            username={data.username}
            connected={connected}
            blocked={isBlocked}
            onConnect={async () => {
              if (!member) return needLogin();
              if (await act(connect(data.username))) toast.success(`${data.name} bağlantılarına eklendi`);
            }}
            onMessage={async () => {
              if (!member) return needLogin();
              const res = await act(startConversation(data.username));
              if (res) router.push(`/mesajlar?c=${res.id}`);
            }}
            onReport={member ? () => setReport({ type: "Profil", id: data.username, username: data.username, label: data.name }) : undefined}
            onBlock={
              member
                ? async () => {
                    if (isBlocked) {
                      if (await act(unblockUser(data.username))) toast(`${data.name} engeli kaldırıldı`);
                    } else if (await act(blockUser(data.username))) toast(`${data.name} engellendi`, { description: "Sana mesaj atamaz, bağlantı kuramaz." });
                  }
                : undefined
            }
          />
        }
        sidebarTop={
          member && profile ? (
            <div className="rounded-3xl border bg-card p-6 text-sm">
              <p className="text-muted-foreground">Senin sezon puanın</p>
              <p className="mt-1 text-2xl font-semibold">
                {myScore.season}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  · {myScore.level === data.level ? (data.score > myScore.season ? `${data.score - myScore.season} puan geridesin` : "öndesin") : `${myScore.level} ligindesin`}
                </span>
              </p>
            </div>
          ) : null
        }
      />
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </>
  );
}
