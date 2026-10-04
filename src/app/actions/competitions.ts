"use server";

import { z } from "zod";
import { parseRepoUrl, peerPoints } from "@/lib/score";
import { check, FIELD, run, text, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { loadMe, syncScore } from "@/lib/server/me";
import { notify, scoreEvent } from "@/lib/server/notify";
import { allow } from "@/lib/server/rate";

const CompId = z.string().regex(/^y-[0-9]{2,4}$/, "Geçersiz yarışma.");
const TeamId = z.string().regex(/^t-[A-Za-z0-9-]{2,40}$/, "Geçersiz takım.");

async function competition(id: string) {
  const r = await db().from("competitions").select("id, code, status, apply_deadline, positions").eq("id", id).maybeSingle();
  if (!r.data) throw new UserError("Bu yarışma bulunamadı.");
  return r.data as { id: string; code: string; status: string; apply_deadline: string; positions: { field: string }[] };
}

const ApplyInput = z.object({ competitionId: CompId, field: FIELD, note: text(300).optional() });

export async function applyCompetition(input: z.input<typeof ApplyInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = ApplyInput.parse(input);
    const c = await competition(v.competitionId);
    if (c.status !== "Başvurular açık") throw new UserError("Bu yarışmanın başvuruları kapandı.");
    if (new Date(`${c.apply_deadline}T23:59:59+03:00`).getTime() < Date.now()) throw new UserError("Son başvuru tarihi geçti.");
    if (!c.positions.some((p) => p.field === v.field)) throw new UserError("Bu yarışmada böyle bir pozisyon yok.");
    check(
      await db().from("applications").upsert({ competition_id: c.id, user_id: user.id, field: v.field, note: v.note || null }, { onConflict: "competition_id,user_id" }),
      "başvuru",
    );
    await notify(user.id, `${c.code} başvurun alındı. Takımlar son başvuru tarihinden sonra kurulacak.`, `/yarismalar/${c.id}`);
    return loadMe(user.id, user.email);
  });
}

export async function withdrawCompetition(competitionId: string) {
  return run(async () => {
    const user = await requireUser();
    const c = await competition(CompId.parse(competitionId));
    if (c.status !== "Başvurular açık") throw new UserError("Takımlar kurulduktan sonra başvuru geri çekilemez.");
    check(await db().from("applications").delete().eq("competition_id", c.id).eq("user_id", user.id), "başvuru");
    return loadMe(user.id, user.email);
  });
}

/** Kullanıcı bu takımın üyesi mi? Değilse hata. */
async function membership(teamId: string, userId: string) {
  const r = await db().from("team_members").select("competition_id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (!r.data) throw new UserError("Bu takımın üyesi değilsin.");
  const c = await competition((r.data as { competition_id: string }).competition_id);
  return c;
}

const SubmitInput = z.object({ teamId: TeamId, repoUrl: z.string().trim().max(200) });

export async function submitTeamRepo(input: z.input<typeof SubmitInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = SubmitInput.parse(input);
    const c = await membership(v.teamId, user.id);
    if (c.status !== "Devam ediyor") throw new UserError("Teslim sadece yarışma devam ederken yapılabilir.");
    const repo = parseRepoUrl(v.repoUrl);
    if (!repo) throw new UserError("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
    check(
      await db().from("teams").update({ repo_url: `https://github.com/${repo.owner}/${repo.repo}`, submitted_at: new Date().toISOString() }).eq("id", v.teamId),
      "teslim",
    );
    const mates = (check(await db().from("team_members").select("user_id").eq("team_id", v.teamId).neq("user_id", user.id), "üyeler") as { user_id: string }[]).map((m) => m.user_id);
    for (const m of mates) await notify(m, `${c.code}: takımın teslimi yapıldı (${repo.owner}/${repo.repo}).`, `/takim/${v.teamId}`);
    return true;
  });
}

const RateInput = z.object({
  teamId: TeamId,
  ratings: z.record(z.string().regex(/^[a-z0-9_-]{3,30}$/), z.number().int().min(1, "Puan 1 ile 5 arasında olmalı.").max(5, "Puan 1 ile 5 arasında olmalı.")),
});

/** Akran puanı: tamamlanan yarışmada, aynı takımdaki diğer üyelere, kişi başı bir kez. */
export async function ratePeers(input: z.input<typeof RateInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = RateInput.parse(input);
    const c = await membership(v.teamId, user.id);
    if (c.status !== "Tamamlandı") throw new UserError("Takım arkadaşları yarışma bittikten sonra puanlanır.");
    const members = check(await db().from("team_members").select("user_id, profiles(username)").eq("team_id", v.teamId).neq("user_id", user.id), "üyeler") as unknown as {
      user_id: string;
      profiles: { username: string } | null;
    }[];
    const byName = new Map(members.map((m) => [m.profiles?.username ?? "", m.user_id]));
    const rows = Object.entries(v.ratings).map(([username, stars]) => {
      const to = byName.get(username);
      if (!to) throw new UserError("Sadece takım arkadaşlarını puanlayabilirsin.");
      return { competition_id: c.id, team_id: v.teamId, from_user: user.id, to_user: to, stars };
    });
    if (!rows.length) throw new UserError("En az bir kişiyi puanla.");
    const ins = await db().from("peer_ratings").insert(rows);
    if (ins.error?.code === "23505") throw new UserError("Bu takımı zaten puanladın.");
    check(ins, "akran puanı");

    for (const r of rows) {
      const all = (check(await db().from("peer_ratings").select("competition_id, stars, from_user").eq("to_user", r.to_user), "akran") as {
        competition_id: string;
        stars: number;
        from_user: string;
      }[]).map((x) => ({ stars: x.stars, competitionId: x.competition_id, from: x.from_user }));
      const gain = peerPoints(all) - peerPoints(all.filter((x) => !(x.from === user.id && x.competitionId === c.id)));
      await scoreEvent(r.to_user, "Akran puanı", `${c.code} takım arkadaşından ${r.stars} yıldız`, gain);
      await syncScore(r.to_user);
      await notify(r.to_user, `${c.code} takım arkadaşın seni puanladı.`, `/yarismalar/${c.id}`);
    }
    return loadMe(user.id, user.email);
  });
}

const TeamMessage = z.object({ teamId: TeamId, text: z.string().trim().min(1, "Boş mesaj gönderilemez.").max(2000, "Mesaj en fazla 2000 karakter olabilir.") });

export async function sendTeamMessage(input: z.input<typeof TeamMessage>) {
  return run(async () => {
    const user = await requireUser();
    const v = TeamMessage.parse(input);
    await membership(v.teamId, user.id);
    if (!(await allow(user.id, "message", 300, 1))) throw new UserError("Çok hızlı mesaj gönderiyorsun.");
    const row = check(await db().from("team_messages").insert({ team_id: v.teamId, user_id: user.id, text: v.text }).select("id, created_at").single(), "mesaj") as {
      id: number;
      created_at: string;
    };
    return { id: String(row.id), at: row.created_at };
  });
}

const DirectMessage = z.object({ conversationId: z.string().uuid(), text: z.string().trim().min(1, "Boş mesaj gönderilemez.").max(2000, "Mesaj en fazla 2000 karakter olabilir.") });

export async function sendMessage(input: z.input<typeof DirectMessage>) {
  return run(async () => {
    const user = await requireUser();
    const v = DirectMessage.parse(input);
    const conv = await db().from("conversations").select("user_a, user_b").eq("id", v.conversationId).maybeSingle();
    const c = conv.data as { user_a: string; user_b: string } | null;
    if (!c || (c.user_a !== user.id && c.user_b !== user.id)) throw new UserError("Bu sohbete mesaj gönderemezsin.");
    if (!(await allow(user.id, "message", 300, 1))) throw new UserError("Çok hızlı mesaj gönderiyorsun.");
    const row = check(await db().from("messages").insert({ conversation_id: v.conversationId, sender_id: user.id, text: v.text }).select("id, created_at").single(), "mesaj") as {
      id: number;
      created_at: string;
    };
    return { id: String(row.id), at: row.created_at };
  });
}
