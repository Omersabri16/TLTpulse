import "server-only";

import { MIN_AUTHORSHIP, scoreRepo } from "@/lib/score";
import type { ProjectAnalysis } from "@/lib/types";

// İstekler her zaman api.github.com'a, owner/repo ayrıştırılmış ve doğrulanmış olarak gider
// (kullanıcının verdiği URL'ye istek atılmaz: SSRF). GITHUB_TOKEN varsa saatlik sınır 60'tan 5000'e çıkar.

const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

class GitHubError extends Error {}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "tltpulse" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (r.status === 404) throw new GitHubError("Repo bulunamadı ya da gizli. Sadece herkese açık repolar eklenebilir.");
  if (r.status === 403 || r.status === 429) throw new GitHubError("GitHub şu an çok fazla istek aldı. Birkaç dakika sonra tekrar dene.");
  if (!r.ok) throw new GitHubError("GitHub'a ulaşılamadı. Biraz sonra tekrar dene.");
  return (await r.json()) as T;
}

/** GitHub kullanıcı adının bio'sunda doğrulama kodu var mı? */
export async function bioHasCode(login: string, code: string) {
  if (!OWNER.test(login) || !code) return false;
  try {
    const u = await gh<{ bio: string | null; name: string | null }>(`/users/${login}`);
    return (u.bio ?? "").includes(code);
  } catch (e) {
    if (e instanceof GitHubError) throw e;
    return false;
  }
}

const TEST_PATH = /(^|\/)(tests?|__tests__|specs?|e2e|cypress)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py|rb)$|(^|\/)test_[^/]+\.py$|Tests?\.(java|kt|cs|swift)$/i;
const CI_PATH = /^(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.yml|\.circleci\/config\.yml|azure-pipelines\.yml|Jenkinsfile|\.travis\.yml)$/i;
const README = /^readme(\.[a-z]+)?$/i;

export interface RepoAnalysis {
  ok: true;
  analysis: ProjectAnalysis;
  language: string;
  homepage: string | null;
}

export type AnalyzeOutcome = RepoAnalysis | { ok: false; reason: string; authorship?: number };

/** Gerçek analiz: repo bilgisi, diller, katkıcılar ve dosya ağacı (4 istek). */
export async function analyzeRepo(owner: string, repo: string, opts: { githubUser: string; techs: number; role: "Tek başıma" | "Takımla"; demoUrl?: string }): Promise<AnalyzeOutcome> {
  if (!OWNER.test(owner) || !REPO.test(repo)) return { ok: false, reason: "Geçerli bir GitHub repo linki gir: github.com/kullanici/repo" };
  try {
    const info = await gh<{ fork: boolean; private: boolean; default_branch: string; language: string | null; homepage: string | null; size: number; full_name: string }>(`/repos/${owner}/${repo}`);
    if (info.private) return { ok: false, reason: "Sadece herkese açık repolar eklenebilir." };
    if (info.fork) return { ok: false, reason: "Fork'lar eklenemez; kendi yazdığın repoyu ekle.", authorship: 0 };

    const [langs, contributors, tree] = await Promise.all([
      gh<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
      gh<{ login: string; contributions: number; type: string }[]>(`/repos/${owner}/${repo}/contributors?per_page=100&anon=1`).catch(() => []),
      gh<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`).catch(() => ({ tree: [], truncated: false })),
    ]);

    const total = contributors.reduce((a, c) => a + c.contributions, 0);
    const mine = contributors.filter((c) => c.login?.toLowerCase() === opts.githubUser.toLowerCase()).reduce((a, c) => a + c.contributions, 0);
    const authorship = total ? Math.round((mine / total) * 100) : 0;
    if (authorship < MIN_AUTHORSHIP)
      return {
        ok: false,
        authorship,
        reason: `Bu repodaki commit'lerin %${authorship}'i senin (@${opts.githubUser}). Eklemek için en az %${MIN_AUTHORSHIP} olmalı.`,
      };

    const files = tree.tree.filter((f) => f.type === "blob").map((f) => f.path);
    const analysis = scoreRepo({
      techs: opts.techs,
      languages: Object.keys(langs).length,
      files: files.length,
      commits: total,
      role: opts.role,
      readme: files.some((f) => README.test(f)),
      tests: files.some((f) => TEST_PATH.test(f)),
      ci: files.some((f) => CI_PATH.test(f)),
      demo: !!opts.demoUrl || !!info.homepage,
      authorship,
    });
    return { ok: true, analysis, language: info.language ?? Object.keys(langs)[0] ?? "", homepage: info.homepage };
  } catch (e) {
    if (e instanceof GitHubError) return { ok: false, reason: e.message };
    return { ok: false, reason: "GitHub'a ulaşılamadı. Biraz sonra tekrar dene." };
  }
}
