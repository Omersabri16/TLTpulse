import { COMPETITIONS, findUser } from "./mock";
import type { Competition, Team } from "./types";

export function teamOf(c: Competition, username: string): Team | undefined {
  return c.teams.find((t) => t.members.some((m) => m.username === username));
}

/** Profilde gösterilecek yarışma geçmişi. */
export function competitionHistory(username: string) {
  return COMPETITIONS.flatMap((c) => {
    const t = teamOf(c, username);
    if (!t) return [];
    const m = t.members.find((x) => x.username === username)!;
    const detail = c.status === "Tamamlandı" ? (t.rank && t.rank <= 3 ? `${t.rank}. · ${m.field}` : `Katıldı · ${m.field}`) : `Devam ediyor · ${m.field}`;
    return [{ id: c.id, label: `${c.code} ${c.title}`, detail, team: t }];
  });
}

/** Takım arkadaşları ve bağlantılar için kullanıcı adından isim/alan. */
export function personOf(username: string, me?: { username: string; name: string; field: string }) {
  if (me && username === me.username) return { username, name: me.name, field: me.field };
  const u = findUser(username);
  return u ? { username, name: u.name, field: u.field as string } : { username, name: username, field: "" };
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
