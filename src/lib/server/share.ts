import "server-only";

import { db } from "./admin";

const USERNAME = /^[a-z0-9_-]{3,30}$/;

/** Kişinin paylaşılacak son başarısı: son kapanan sezonda yükseldiyse ya da şampiyon olduysa o; yoksa şu anki ligi. */
export async function shareInfo(username: string) {
  if (!USERNAME.test(username)) return null;
  const p = (await db().from("profiles").select("id, name, league, field, season_points, suspended").eq("username", username).maybeSingle()).data as {
    id: string;
    name: string;
    league: string;
    field: string;
    season_points: number;
    suspended: boolean;
  } | null;
  if (!p || p.suspended) return null;
  const rank = (l: string) => (l === "Kıdemli" ? 2 : l === "Orta" ? 1 : 0);
  const results = ((await db().from("season_results").select("season_id, from_league, to_league, season_points, rank, champion").eq("user_id", p.id).order("season_id", { ascending: false }).limit(1)).data ?? []) as {
    season_id: number;
    from_league: string;
    to_league: string;
    season_points: number;
    rank: number;
    champion: boolean;
  }[];
  const r = results[0];
  const achieved = r && (r.champion || rank(r.to_league) > rank(r.from_league)) ? r : null;
  const season = achieved ? ((await db().from("seasons").select("name").eq("id", achieved.season_id).maybeSingle()).data as { name: string } | null)?.name ?? "Sezon" : null;
  return {
    name: p.name,
    field: p.field,
    league: achieved?.to_league ?? p.league,
    headline: achieved ? (achieved.champion ? `${season} şampiyonu` : `${achieved.to_league} lige yükseldi`) : `${p.league} liginde`,
    sub: achieved ? `${season} · ${achieved.season_points} puan · ${achieved.rank}. sıra` : `Bu sezon ${p.season_points} puan`,
    achieved: !!achieved,
  };
}
