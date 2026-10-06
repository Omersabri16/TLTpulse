import "server-only";

import type { Level, SeasonInfo } from "@/lib/types";
import { db } from "./admin";

let cached: { at: number; season: SeasonInfo | null } | null = null;

/** Açık sezon (60 sn önbellekli; sezon kapanınca `forgetSeason` ile sıfırlanır). */
export async function openSeason(): Promise<SeasonInfo | null> {
  if (cached && Date.now() - cached.at < 60_000) return cached.season;
  const r = await db().from("seasons").select("id, name, starts_at, ends_at").is("closed_at", null).order("id", { ascending: false }).limit(1).maybeSingle();
  if (r.error) throw new Error(`sezon: ${r.error.message}`);
  const s = r.data as { id: number; name: string; starts_at: string; ends_at: string } | null;
  const season = s ? { id: s.id, name: s.name, startsAt: s.starts_at, endsAt: s.ends_at } : null;
  cached = { at: Date.now(), season };
  return season;
}

export const forgetSeason = () => {
  cached = null;
};

/** Ligdeki sıra: sezon puanı azalan; eşitlikte o puana önce ulaşan öne geçer. Askıdakiler sayılmaz. */
export async function rankFor(league: Level, points: number, at: string | null) {
  const base = () => db().from("profiles").select("id", { count: "exact", head: true }).eq("league", league).eq("suspended", false);
  const ahead = at ? base().or(`season_points.gt.${points},and(season_points.eq.${points},season_points_at.lt.${at})`) : base().gt("season_points", points);
  const [a, all] = await Promise.all([ahead, base()]);
  return { rank: (a.count ?? 0) + 1, of: all.count ?? 0 };
}

export interface CloseResult {
  promoted: number;
  relegated: number;
  champions: number;
  next_season: number;
}

/** Sezon kapanışı tek SQL işleminde (supabase/migrations/0003, `close_season`). Sonra Certifier sertifikaları sıraya girer. */
export async function closeSeason(seasonId: number): Promise<CloseResult> {
  const r = await db().rpc("close_season", { p_season: seasonId });
  if (r.error) throw new Error(`sezon kapanışı: ${r.error.message}`);
  forgetSeason();
  const champs = await db().from("season_results").select("user_id").eq("season_id", seasonId).eq("champion", true);
  const season = await db().from("seasons").select("name").eq("id", seasonId).single();
  const name = (season.data as { name: string } | null)?.name ?? `Sezon ${seasonId}`;
  const rows = ((champs.data ?? []) as { user_id: string }[]).map((c) => ({ user_id: c.user_id, kind: "Sezon şampiyonu", ref: `sezon-${seasonId}`, title: `TLTpulse ${name} şampiyonu` }));
  if (rows.length) await db().from("credentials").upsert(rows, { onConflict: "user_id,kind,ref", ignoreDuplicates: true });
  return r.data as CloseResult;
}
