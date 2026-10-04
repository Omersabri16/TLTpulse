"use client";

import type { ProfileData } from "@/components/profile-view";
import { competitionHistory, personOf } from "./competitions";
import { publicData } from "./public-profile";
import { hash } from "./score";
import { useApp, useHydrated, useMyScore } from "./store";

/** Oturum sahibiyse güncel veriyi, değilse herkese açık veriyi döner. */
export function useProfileData(username: string): { data: ProfileData | null; ready: boolean } {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const projects = useApp((s) => s.projects);
  const certs = useApp((s) => s.certs);
  const references = useApp((s) => s.references);
  const score = useMyScore();

  if (!hydrated) return { data: null, ready: false };
  if (session?.username === username && profile) {
    const me = { username: profile.username, name: profile.name, field: profile.field };
    return {
      ready: true,
      data: {
        ...profile,
        projects: projects.map((p) => ({ id: p.id, name: p.name, techs: p.techs, description: p.description, difficulty: p.analysis.difficulty, quality: p.analysis.quality, points: p.analysis.points, repoUrl: p.repoUrl })),
        references,
        certs,
        competitions: competitionHistory(profile.username),
        connections: profile.connections.map((u) => personOf(u, me)),
        score: score.total,
        level: score.level,
        rank: score.rank,
      },
    };
  }
  return { data: publicData(username), ready: true };
}

/** CV doğrulama kodu: kullanıcı adından türetilir (gerçekte CV oluşturulduğu an kaydedilecek). */
export const cvCode = (username: string) => "TLT-" + (hash(username) % 1679616).toString(36).toUpperCase().padStart(4, "0");
