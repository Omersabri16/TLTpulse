"use client";

// Uygulama durumu. Backend yokken tarayıcıda (localStorage) tutuluyor;
// Supabase bağlanınca aksiyonlar API çağrılarına dönüşecek, bileşenler aynı kalacak.
import { useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  DEMO_CERTS,
  DEMO_CONVERSATIONS,
  DEMO_HISTORY,
  DEMO_NOTIFICATIONS,
  DEMO_PEER,
  DEMO_PROFILE,
  DEMO_PROJECTS,
  DEMO_REFERENCES,
  TEAM_CHAT_SEED,
} from "./mock";
import { computeScore, myRank, referencePoints, stepDone } from "./score";
import type {
  Certificate,
  Conversation,
  Experience,
  Field,
  Notification,
  Profile,
  Project,
  Reference,
  Roadmap,
  ScoreEvent,
} from "./types";

type ChatLine = { from: string; text: string; at: string };

interface AppState {
  session: { username: string } | null;
  profile: Profile | null;
  projects: Project[];
  certs: Certificate[];
  references: Reference[];
  peerReceived: { from: string; competitionId: string; stars: number; note?: string }[];
  peerGiven: Record<string, Record<string, number>>;
  history: ScoreEvent[];
  applications: Record<string, Field>;
  submissions: Record<string, string>;
  roadmap: Roadmap | null;
  conversations: Conversation[];
  teamChats: Record<string, ChatLine[]>;
  notifications: Notification[];

  login: (email: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  addExperience: (e: Omit<Experience, "id">) => string;
  removeExperience: (id: string) => void;
  addProject: (p: Project) => void;
  removeProject: (id: string) => void;
  addCertificate: (c: Certificate) => void;
  requestReference: (r: Omit<Reference, "token" | "status" | "requestedAt" | "points">) => string;
  answerReference: (token: string, approve: boolean, comment?: string) => void;
  apply: (competitionId: string, field: Field) => void;
  withdraw: (competitionId: string) => void;
  submitRepo: (teamId: string, url: string) => void;
  ratePeers: (teamId: string, ratings: Record<string, number>) => void;
  setRoadmap: (r: Roadmap | null) => void;
  startConversation: (username: string) => string;
  sendMessage: (conversationId: string, text: string) => void;
  sendTeamMessage: (teamId: string, text: string) => void;
  markNotificationsRead: () => void;
  notify: (text: string, href: string) => void;
}

const now = () => new Date().toISOString();
const clock = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const slug = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]/g, "");

const EMPTY = {
  session: null,
  profile: null,
  projects: [],
  certs: [],
  references: [],
  peerReceived: [],
  peerGiven: {},
  history: [],
  applications: {},
  submissions: {},
  roadmap: null,
  conversations: [],
  teamChats: {},
  notifications: [],
};

const demoState = () => ({
  session: { username: DEMO_PROFILE.username },
  profile: structuredClone(DEMO_PROFILE),
  projects: structuredClone(DEMO_PROJECTS),
  certs: structuredClone(DEMO_CERTS),
  references: structuredClone(DEMO_REFERENCES),
  peerReceived: structuredClone(DEMO_PEER),
  peerGiven: {},
  history: structuredClone(DEMO_HISTORY),
  applications: {},
  submissions: {},
  roadmap: null,
  conversations: structuredClone(DEMO_CONVERSATIONS),
  teamChats: structuredClone(TEAM_CHAT_SEED),
  notifications: structuredClone(DEMO_NOTIFICATIONS),
});

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      // Demo: her e-posta demo hesabına (Deniz) giriş yapar.
      login: () => set(demoState()),

      register: (name, email) => {
        const username = slug(name) || "yeni";
        set({
          ...EMPTY,
          session: { username },
          profile: {
            username, name, email, headline: "", field: "", school: "", department: "", city: "", github: "", about: "",
            interests: [], skills: [], experiences: [], education: [], connections: [],
          },
          notifications: [{ id: uid("n"), text: "TLTpulse'a hoş geldin! İlk projeni ekleyerek başla.", href: "/projeler", at: "Şimdi", read: false }],
        });
      },

      logout: () => set({ ...EMPTY }),

      updateProfile: (p) => set((s) => ({ profile: s.profile ? { ...s.profile, ...p } : s.profile })),

      addExperience: (e) => {
        const id = uid("exp");
        set((s) => ({ profile: s.profile ? { ...s.profile, experiences: [{ ...e, id }, ...s.profile.experiences] } : s.profile }));
        return id;
      },
      removeExperience: (id) => set((s) => ({ profile: s.profile ? { ...s.profile, experiences: s.profile.experiences.filter((x) => x.id !== id) } : s.profile })),

      addProject: (p) =>
        set((s) => {
          // Projede kullanılan teknolojiler "Kod" kanıtlı beceri olur.
          const skills = [...(s.profile?.skills ?? [])];
          for (const t of p.techs) {
            const i = skills.findIndex((k) => k.name.toLowerCase() === t.toLowerCase());
            if (i === -1) skills.push({ name: t, proof: "Kod" });
            else if (skills[i].proof === "Beyan") skills[i] = { name: skills[i].name, proof: "Kod" };
          }
          return {
            projects: [p, ...s.projects],
            profile: s.profile ? { ...s.profile, skills } : s.profile,
            history: [{ id: uid("h"), at: now(), source: "Projeler", label: `${p.name} eklendi`, points: p.analysis.points }, ...s.history],
          };
        }),
      removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addCertificate: (c) =>
        set((s) => ({
          certs: [c, ...s.certs],
          history: c.points ? [{ id: uid("h"), at: now(), source: "Sertifikalar", label: `${c.provider} · ${c.name}`, points: c.points }, ...s.history] : s.history,
        })),

      requestReference: (r) => {
        const token = uid("onay");
        set((s) => ({ references: [{ ...r, token, status: "Bekliyor", requestedAt: now(), points: 0 }, ...s.references] }));
        return token;
      },

      answerReference: (token, approve, comment) =>
        set((s) => {
          const ref = s.references.find((r) => r.token === token);
          if (!ref || ref.status !== "Bekliyor") return {};
          const points = approve ? referencePoints(ref.approverEmail, !!comment?.trim()) : 0;
          return {
            references: s.references.map((r) =>
              r.token === token ? { ...r, status: approve ? "Onaylandı" : "Reddedildi", comment: comment?.trim() || undefined, answeredAt: now(), points } : r,
            ),
            history: approve ? [{ id: uid("h"), at: now(), source: "Referanslar", label: `${ref.approverName} onayladı: ${ref.targetLabel}`, points }, ...s.history] : s.history,
            notifications: [
              { id: uid("n"), text: approve ? `${ref.approverName} onay verdi${comment ? " ve yorum yazdı" : ""}.` : `${ref.approverName} onay isteğini reddetti.`, href: "/profil", at: "Şimdi", read: false },
              ...s.notifications,
            ],
          };
        }),

      apply: (competitionId, field) => set((s) => ({ applications: { ...s.applications, [competitionId]: field } })),
      withdraw: (competitionId) =>
        set((s) => {
          const a = { ...s.applications };
          delete a[competitionId];
          return { applications: a };
        }),

      submitRepo: (teamId, url) => set((s) => ({ submissions: { ...s.submissions, [teamId]: url } })),

      ratePeers: (teamId, ratings) => set((s) => ({ peerGiven: { ...s.peerGiven, [teamId]: ratings } })),

      setRoadmap: (r) => set({ roadmap: r }),

      startConversation: (username) => {
        const ex = get().conversations.find((c) => c.with === username);
        if (ex) return ex.id;
        const id = uid("cv");
        set((s) => ({ conversations: [{ id, with: username, messages: [] }, ...s.conversations] }));
        return id;
      },

      sendMessage: (conversationId, text) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, { id: uid("m"), from: "me", text, at: clock() }] } : c,
          ),
        })),

      sendTeamMessage: (teamId, text) =>
        set((s) => ({ teamChats: { ...s.teamChats, [teamId]: [...(s.teamChats[teamId] ?? []), { from: "me", text, at: clock() }] } })),

      markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      notify: (text, href) => set((s) => ({ notifications: [{ id: uid("n"), text, href, at: "Şimdi", read: false }, ...s.notifications] })),
    }),
    {
      name: "tltpulse",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { login, register, logout, ...data } = s;
        return Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== "function"));
      },
    },
  ),
);

/** localStorage okunana kadar false; yönlendirmeler bunu beklemeli. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useApp.persist.onFinishHydration(cb),
    () => useApp.persist.hasHydrated(),
    () => false,
  );
}

/** Sunucuda false, tarayıcıda true (hydration uyumsuzluğu olmadan). */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Oturum sahibinin puanı, ligi ve sırası. */
export function useMyScore() {
  const s = useApp(
    useShallow((s) => ({
      session: s.session,
      profile: s.profile,
      projects: s.projects,
      certs: s.certs,
      references: s.references,
      peerReceived: s.peerReceived,
      peerGiven: s.peerGiven,
      roadmap: s.roadmap,
      applications: s.applications,
    })),
  );
  return useMemo(() => {
    const ctx = {
      profile: s.profile!,
      projects: s.projects,
      certs: s.certs,
      references: s.references,
      applications: s.applications,
      peerGivenCount: Object.keys(s.peerGiven).length,
    };
    const roadmapDone = s.roadmap && s.profile ? s.roadmap.steps.filter((st) => stepDone(st, ctx, s.roadmap!.baseline)).map((st) => st.id) : [];
    const score = computeScore({
      username: s.session?.username ?? "",
      profile: s.profile,
      projects: s.projects,
      certs: s.certs,
      references: s.references,
      peerReceived: s.peerReceived,
      roadmap: s.roadmap,
      roadmapDone,
    });
    const p = s.profile;
    const rank = p
      ? myRank({ username: p.username, name: p.name, school: p.school, city: p.city, field: (p.field || "Backend") as Field, score: score.total, trend: 0 })
      : { rank: 0, of: 0 };
    return { ...score, rank, roadmapDone };
  }, [s]);
}
