import "server-only";

import { db } from "./admin";

// Certifier (kararlar.md Bölüm 8): doğrulama sonucumuzu sahtesi yapılamayan, LinkedIn'e eklenebilen sertifikaya çevirir.
// Sadece önemli başarılarda (yarışmayı %50+ ile tamamlamak, Sezon şampiyonu): ücretsiz kota yılda 250.
// Anahtar yoksa ya da API hata verirse kayıt "Beklemede" kalır, günlük iş tekrar dener; akış bozulmaz.
// Ortam: CERTIFIER_API_KEY, CERTIFIER_GROUP_ID (paneldeki sertifika tasarımı grubu).

const VIEW = (publicId: string) => `https://credsverse.com/credentials/${encodeURIComponent(publicId)}`;
const MAX_ATTEMPTS = 5;

export const certifierConfigured = () => !!(process.env.CERTIFIER_API_KEY && process.env.CERTIFIER_GROUP_ID);

async function issue(name: string, email: string, title: string) {
  const r = await fetch("https://api.certifier.io/v1/credentials/create-issue-send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CERTIFIER_API_KEY}`,
      "Certifier-Version": "2022-10-26",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId: process.env.CERTIFIER_GROUP_ID,
      recipient: { name, email },
      issueDate: new Date().toISOString().slice(0, 10),
      customAttributes: { "custom.basari": title },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Certifier ${r.status}`);
  const j = (await r.json()) as { publicId?: string; id?: string };
  return j.publicId ? VIEW(j.publicId) : null;
}

/** Bekleyen sertifikaları gönderir (günlük iş). Dönen: gönderilen sayısı. */
export async function sendPendingCredentials(limit = 10) {
  if (!certifierConfigured()) return 0;
  const rows = ((await db().from("credentials").select("id, user_id, title, attempts").eq("status", "Beklemede").lt("attempts", MAX_ATTEMPTS).order("created_at").limit(limit)).data ?? []) as {
    id: string;
    user_id: string;
    title: string;
    attempts: number;
  }[];
  let sent = 0;
  for (const c of rows) {
    try {
      const [{ data: p }, { data: u }] = await Promise.all([db().from("profiles").select("name").eq("id", c.user_id).single(), db().auth.admin.getUserById(c.user_id)]);
      const email = u.user?.email;
      if (!p || !email) throw new Error("alıcı yok");
      const url = await issue((p as { name: string }).name, email, c.title);
      await db().from("credentials").update({ status: "Gönderildi", url, attempts: c.attempts + 1, last_error: null }).eq("id", c.id);
      sent++;
    } catch (e) {
      await db()
        .from("credentials")
        .update({ attempts: c.attempts + 1, last_error: (e instanceof Error ? e.message : "hata").slice(0, 200) })
        .eq("id", c.id);
    }
  }
  return sent;
}
