import type { ProfileData } from "@/components/profile-view";
import { competitionHistory, personOf } from "./competitions";
import { DEMO_CERTS, DEMO_PROFILE, DEMO_PROJECTS, DEMO_REFERENCES, findUser, ME_USERNAME, USERS } from "./mock";
import { leagueRows, levelOf } from "./score";

function rankOf(username: string, score: number) {
  const lvl = levelOf(score);
  const same = leagueRows(null).filter((r) => levelOf(r.score) === lvl);
  return { rank: same.findIndex((r) => r.username === username) + 1, of: same.length };
}

/** Herkese açık profil verisi. Backend gelince tek sorgu olacak. */
export function publicData(username: string): ProfileData | null {
  if (username === ME_USERNAME) {
    const score = 61;
    return {
      ...DEMO_PROFILE,
      projects: DEMO_PROJECTS.map((p) => ({ id: p.id, name: p.name, techs: p.techs, description: p.description, difficulty: p.analysis.difficulty, quality: p.analysis.quality, repoUrl: p.repoUrl })),
      references: DEMO_REFERENCES,
      certs: DEMO_CERTS,
      competitions: competitionHistory(username),
      connections: DEMO_PROFILE.connections.map((u) => personOf(u)),
      score,
      level: levelOf(score),
      rank: { rank: 0, of: 0 },
    };
  }
  const u = findUser(username);
  if (!u) return null;
  const projectTechs = u.projects.flatMap((p) => p.techs.map((t) => t.toLowerCase()));
  return {
    username: u.username,
    name: u.name,
    headline: `${u.field} geliştirici`,
    field: u.field,
    school: u.school,
    city: u.city,
    github: u.github,
    about: u.about,
    projects: u.projects.map((p, i) => ({ id: `${u.username}-${i}`, name: p.name, techs: p.techs, description: p.description, difficulty: p.difficulty, repoUrl: `https://github.com/${u.github}/${p.name}` })),
    experiences: [],
    references: [],
    certs: [],
    competitions: competitionHistory(u.username),
    education: [{ school: u.school, department: "Bilgisayar Mühendisliği", start: "", end: "" }],
    skills: u.skills.map((s) => ({ name: s, proof: projectTechs.includes(s.toLowerCase()) ? "Kod" : "Beyan" })),
    interests: u.interests,
    connections: USERS.filter((x) => x.username !== u.username && x.field !== u.field)
      .slice(0, 4)
      .map((x) => ({ username: x.username, name: x.name, field: x.field })),
    score: u.score,
    level: levelOf(u.score),
    rank: rankOf(u.username, u.score),
  };
}
