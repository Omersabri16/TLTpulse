import type { Competition, Team } from "./types";

export function teamOf(c: Competition, username: string): Team | undefined {
  return c.teams.find((t) => t.members.some((m) => m.username === username));
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
};

export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
