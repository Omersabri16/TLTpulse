import "server-only";

import { db } from "./admin";

export async function notify(userId: string, text: string, href: string) {
  await db().from("notifications").insert({ user_id: userId, text: text.slice(0, 300), href });
}
