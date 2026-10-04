import "server-only";

import type { ScoreSource } from "@/lib/types";
import { db } from "./admin";

export async function notify(userId: string, text: string, href: string) {
  await db().from("notifications").insert({ user_id: userId, text: text.slice(0, 300), href });
}

export async function scoreEvent(userId: string, source: ScoreSource, label: string, points: number) {
  if (points) await db().from("score_events").insert({ user_id: userId, source, label: label.slice(0, 200), points });
}
