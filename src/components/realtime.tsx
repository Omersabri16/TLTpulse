"use client";

import { useEffect, useRef } from "react";
import { refreshMe } from "@/app/actions/auth";
import { useAct, useApp } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { fmtRelative } from "@/lib/time";

/**
 * Yeni mesaj, takım mesajı ve bildirimleri canlı alır. RLS sayesinde tarayıcı sadece kendi
 * sohbetlerinin, takımlarının ve bildirimlerinin satırlarını görebilir.
 */
export function RealtimeBridge() {
  const username = useApp((s) => s.session?.username);
  const addNotification = useApp((s) => s.addNotification);
  const act = useAct();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!username) return;
    const sb = supabaseBrowser();
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void act(refreshMe(), { silent: true }), 400);
    };
    const channel = sb
      .channel(`canli-${username}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p: { new: unknown }) => {
        const n = p.new as { id: string; text: string; href: string; read: boolean; created_at: string };
        addNotification({ id: n.id, text: n.text, href: n.href, read: n.read, at: fmtRelative(n.created_at) });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      void sb.removeChannel(channel);
    };
  }, [username, addNotification, act]);

  return null;
}
