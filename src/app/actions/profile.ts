"use server";

import { z } from "zod";
import { check, FIELD, run, text, UserError } from "@/lib/server/action";
import { db } from "@/lib/server/admin";
import { requireUser } from "@/lib/server/auth";
import { blockedBetween } from "@/lib/server/blocks";
import { bioHasCode, GitHubError } from "@/lib/server/github";
import { loadMe } from "@/lib/server/me";
import { notify } from "@/lib/server/notify";
import { newGithubCode } from "@/lib/server/profile-init";
import { allow } from "@/lib/server/rate";
import type { Skill } from "@/lib/types";

const tag = z.string().trim().min(1).max(40, "Etiketler en fazla 40 karakter olabilir.");

const ProfileInput = z
  .object({
    name: z.string().trim().min(2, "Adını yaz.").max(80, "Ad çok uzun."),
    headline: text(120),
    field: z.union([FIELD, z.literal("")], { error: "Geçerli bir alan seç." }),
    school: text(120),
    department: text(120),
    city: text(60),
    github: z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, ""))
      .pipe(z.string().regex(/^[A-Za-z0-9-]{0,39}$/, "GitHub kullanıcı adı geçersiz.")),
    about: text(1000, "Hakkında en fazla 1000 karakter olabilir."),
    interests: z.array(tag).max(10, "En fazla 10 ilgi alanı ekleyebilirsin."),
    skills: z.array(tag).max(25, "En fazla 25 beceri ekleyebilirsin."),
    education: z
      .array(z.object({ school: text(120), department: text(120), start: text(20), end: text(20) }))
      .max(5),
  })
  .partial();

/** Profil alanları. Becerilerin kanıt türünü sunucu belirler (istemci "Kod" yazamaz). */
export async function saveProfile(input: z.input<typeof ProfileInput>) {
  return run(async () => {
    const user = await requireUser();
    const v = ProfileInput.parse(input);
    const cur = check(await db().from("profiles").select("github, skills").eq("id", user.id).single(), "profil") as { github: string; skills: Skill[] };

    const patch: Record<string, unknown> = {};
    for (const k of ["name", "headline", "field", "school", "department", "city", "about", "interests", "education"] as const) if (v[k] !== undefined) patch[k] = v[k];

    if (v.skills) {
      const techs = (check(await db().from("projects").select("techs").eq("user_id", user.id), "proje") as { techs: string[] }[]).flatMap((p) => p.techs.map((t) => t.toLowerCase()));
      const seen = new Set<string>();
      patch.skills = v.skills
        .filter((n) => !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
        .map((name): Skill => {
          const prev = cur.skills.find((s) => s.name.toLowerCase() === name.toLowerCase());
          if (techs.includes(name.toLowerCase())) return { name, proof: "Kod" };
          return { name, proof: prev?.proof ?? "Beyan" };
        });
    }
    if (v.github !== undefined && v.github.toLowerCase() !== cur.github.toLowerCase()) {
      // Kullanıcı adı değişince doğrulama sıfırlanır.
      patch.github = v.github;
      patch.github_verified = false;
      patch.github_code = newGithubCode();
    }
    if (Object.keys(patch).length) check(await db().from("profiles").update(patch).eq("id", user.id), "profil güncelleme");
    return loadMe(user.id, user.email);
  });
}

/** GitHub kullanıcı adının bu kişiye ait olduğunu bio'daki kodla doğrular (OAuth gelene kadar). */
export async function verifyGithub() {
  return run(async () => {
    const user = await requireUser();
    if (!(await allow(user.id, "github_verify", 20, 1))) throw new UserError("Çok fazla deneme oldu. Biraz sonra tekrar dene.");
    const p = check(await db().from("profiles").select("github, github_code, github_verified").eq("id", user.id).single(), "profil") as {
      github: string;
      github_code: string;
      github_verified: boolean;
    };
    if (!p.github) throw new UserError("Önce GitHub kullanıcı adını ekle.");
    if (!p.github_verified) {
      const found = await bioHasCode(p.github, p.github_code).catch((e) => {
        throw e instanceof GitHubError ? new UserError(e.message) : e;
      });
      if (!found)
        throw new UserError(`@${p.github} profilinin açıklamasında (bio) "${p.github_code}" kodunu bulamadık. Kaydettikten sonra birkaç saniye bekleyip tekrar dene.`);
      check(await db().from("profiles").update({ github_verified: true }).eq("id", user.id), "doğrulama");
    }
    return loadMe(user.id, user.email);
  });
}

const Username = z.string().regex(/^[a-z0-9_-]{3,30}$/, "Geçersiz kullanıcı adı.");

async function userIdOf(username: string) {
  const r = await db().from("profiles").select("id, name").eq("username", Username.parse(username)).maybeSingle();
  if (!r.data) throw new UserError("Bu kullanıcı bulunamadı.");
  return r.data as { id: string; name: string };
}

// Bağlantı iki taraflı: biri istek gönderir, öbürü kabul edince ikisi de birbirinin bağlantısı olur (connections'ta iki satır).
async function link(a: string, b: string) {
  check(
    await db().from("connections").upsert(
      [
        { user_id: a, other_id: b },
        { user_id: b, other_id: a },
      ],
      { onConflict: "user_id,other_id", ignoreDuplicates: true },
    ),
    "bağlantı",
  );
  await db().from("connection_requests").delete().or(`and(from_id.eq.${a},to_id.eq.${b}),and(from_id.eq.${b},to_id.eq.${a})`);
}

const myName = async (id: string) => check(await db().from("profiles").select("name, username").eq("id", id).single(), "profil") as { name: string; username: string };

/** Bağlantı isteği gönderir. Karşı taraf sana zaten istek gönderdiyse doğrudan bağlanırsınız. */
export async function connect(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await userIdOf(username);
    if (other.id === user.id) throw new UserError("Kendinle bağlantı kuramazsın.");
    if (await blockedBetween(user.id, other.id)) throw new UserError("Bu kişiyle bağlantı kuramazsın.");
    const already = await db().from("connections").select("other_id").eq("user_id", user.id).eq("other_id", other.id).maybeSingle();
    if (already.data) throw new UserError("Zaten bağlantınız var.");
    const me = await myName(user.id);
    const incoming = await db().from("connection_requests").select("from_id").eq("from_id", other.id).eq("to_id", user.id).maybeSingle();
    if (incoming.data) {
      await link(user.id, other.id);
      await notify(other.id, `${me.name} bağlantı isteğini kabul etti.`, `/u/${me.username}`);
      return loadMe(user.id, user.email);
    }
    if (!(await allow(user.id, "connect", 50, 24))) throw new UserError("Bugün çok fazla bağlantı isteği gönderdin.");
    const ins = await db().from("connection_requests").upsert({ from_id: user.id, to_id: other.id }, { onConflict: "from_id,to_id", ignoreDuplicates: true }).select("from_id");
    check(ins, "bağlantı isteği");
    if (ins.data?.length) await notify(other.id, `${me.name} sana bağlantı isteği gönderdi.`, "/baglantilar");
    return loadMe(user.id, user.email);
  });
}

/** Gelen isteği kabul eder ya da reddeder. Reddedilen kişiye bildirim gitmez. */
export async function answerConnection(username: string, accept: boolean) {
  return run(async () => {
    const user = await requireUser();
    const other = await userIdOf(username);
    const req = await db().from("connection_requests").select("from_id").eq("from_id", other.id).eq("to_id", user.id).maybeSingle();
    if (!req.data) throw new UserError("Bu bağlantı isteği artık yok.");
    if (accept) {
      if (await blockedBetween(user.id, other.id)) throw new UserError("Bu kişiyle bağlantı kuramazsın.");
      await link(user.id, other.id);
      const me = await myName(user.id);
      await notify(other.id, `${me.name} bağlantı isteğini kabul etti.`, `/u/${me.username}`);
    } else {
      check(await db().from("connection_requests").delete().eq("from_id", other.id).eq("to_id", user.id), "bağlantı isteği");
    }
    return loadMe(user.id, user.email);
  });
}

/** Gönderdiğin isteği geri çeker. */
export async function cancelConnection(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await userIdOf(username);
    check(await db().from("connection_requests").delete().eq("from_id", user.id).eq("to_id", other.id), "bağlantı isteği");
    return loadMe(user.id, user.email);
  });
}

/** Bağlantıyı iki taraftan da kaldırır. */
export async function removeConnection(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await userIdOf(username);
    check(await db().from("connections").delete().or(`and(user_id.eq.${user.id},other_id.eq.${other.id}),and(user_id.eq.${other.id},other_id.eq.${user.id})`), "bağlantı");
    return loadMe(user.id, user.email);
  });
}

/** Var olan sohbeti bulur ya da açar; sohbet kimliğini döner. */
export async function startConversation(username: string) {
  return run(async () => {
    const user = await requireUser();
    const other = await userIdOf(username);
    if (other.id === user.id) throw new UserError("Kendine mesaj gönderemezsin.");
    if (await blockedBetween(user.id, other.id)) throw new UserError("Bu kişiye mesaj gönderemezsin.");
    const [a, b] = [user.id, other.id].sort();
    const found = await db().from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let id = (found.data as { id: string } | null)?.id;
    if (!id) {
      if (!(await allow(user.id, "conversation", 50, 24))) throw new UserError("Bugün çok fazla yeni sohbet açtın.");
      id = (check(await db().from("conversations").insert({ user_a: a, user_b: b }).select("id").single(), "sohbet") as { id: string }).id;
    }
    return { id, me: await loadMe(user.id, user.email) };
  });
}

export async function markNotificationsRead() {
  return run(async () => {
    const user = await requireUser();
    await db().from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    return true;
  });
}
