"use client";

// Oturum sahibinin verisi. Kaynağı sunucu: kök layout `loadMe` ile doldurur, her aksiyon güncel halini döner.
// Store istek/sekme başına oluşturulur (global değil): sunucuda kullanıcılar arasında veri karışmaz.
import { createContext, createElement, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { createStore, useStore, type StoreApi } from "zustand";
import type { ActionResult, ChatLine, MeData, Notification } from "./types";

export interface AppState extends MeData {
  setMe: (me: MeData) => void;
  appendTeamMessage: (teamId: string, line: ChatLine) => void;
  appendMessage: (conversationId: string, line: ChatLine) => void;
  markAllRead: () => void;
  addNotification: (n: Notification) => void;
}

const createAppStore = (initial: MeData) =>
  createStore<AppState>()((set) => ({
    ...initial,
    setMe: (me) => set(me),
    appendTeamMessage: (teamId, line) =>
      set((s) => {
        const cur = s.teamChats[teamId] ?? [];
        return cur.some((m) => m.id === line.id) ? {} : { teamChats: { ...s.teamChats, [teamId]: [...cur, line] } };
      }),
    appendMessage: (conversationId, line) =>
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === conversationId && !c.messages.some((m) => m.id === line.id) ? { ...c, messages: [...c.messages, line] } : c)),
      })),
    markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    addNotification: (n) => set((s) => (s.notifications.some((x) => x.id === n.id) ? {} : { notifications: [n, ...s.notifications] })),
  }));

const StoreContext = createContext<StoreApi<AppState> | null>(null);

export function AppProvider({ initial, children }: { initial: MeData; children: ReactNode }) {
  const [store] = useState(() => createAppStore(initial));
  // Kök layout yeniden çizildiğinde (router.refresh) sunucunun güncel verisi gelir.
  useEffect(() => {
    store.getState().setMe(initial);
  }, [initial, store]);
  return createElement(StoreContext.Provider, { value: store }, children);
}

export function useApp<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useApp, AppProvider içinde kullanılmalı");
  return useStore(store, selector);
}

/** Oturum sahibinin puanı, ligi ve sırası (sunucuda hesaplanır). */
export const useMyScore = () => useApp((s) => s.score);

/** Sunucuda false, tarayıcıda true (hydration uyumsuzluğu olmadan). */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const isMe = (x: unknown): x is MeData => !!x && typeof x === "object" && "session" in x && "score" in x;

/**
 * Sunucu aksiyonu çağırır: hata varsa gösterir ve null döner; cevapta güncel veri (`me`) varsa store'a yazar.
 * Kullanım: `const res = await act(addProject(input))`.
 */
export function useAct() {
  const setMe = useApp((s) => s.setMe);
  return useCallback(
    async <T,>(p: Promise<ActionResult<T>>, opts: { silent?: boolean } = {}): Promise<T | null> => {
      let res: ActionResult<T>;
      try {
        res = await p;
      } catch {
        if (!opts.silent) toast.error("Sunucuya ulaşılamadı. Bağlantını kontrol et.");
        return null;
      }
      if (!res.ok) {
        if (!opts.silent) toast.error(res.error);
        return null;
      }
      const d = res.data as unknown;
      if (isMe(d)) setMe(d);
      else if (d && typeof d === "object" && "me" in d && isMe((d as { me: unknown }).me)) setMe((d as { me: MeData }).me);
      return res.data;
    },
    [setMe],
  );
}
