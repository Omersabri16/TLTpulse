import "server-only";

import { MIN_AUTHORSHIP, MIN_OWN_FILES, MIN_README_CHARS } from "@/lib/score";

// İstekler her zaman api.github.com'a (ve dosya içeriği için raw.githubusercontent.com'a), owner/repo ayrıştırılmış ve
// doğrulanmış olarak gider; kullanıcının verdiği URL'ye istek atılmaz (SSRF). GITHUB_TOKEN varsa saatlik sınır 60'tan 5000'e çıkar.

export const OWNER = /^[A-Za-z0-9-]{1,39}$/;
export const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const SHA = /^[0-9a-f]{40}$/;

export class GitHubError extends Error {}

function headers() {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "tltpulse" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghRes(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.github.com${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (r.status === 404) throw new GitHubError("Repo bulunamadı ya da gizli. Sadece herkese açık repolar eklenebilir.");
  if (r.status === 403 || r.status === 429) throw new GitHubError("GitHub şu an çok fazla istek aldı. Birkaç dakika sonra tekrar dene.");
  if (r.status === 409) throw new GitHubError("Repo boş görünüyor; önce kodunu push et.");
  if (!r.ok) throw new GitHubError("GitHub'a ulaşılamadı. Biraz sonra tekrar dene.");
  return r;
}

export async function gh<T>(path: string): Promise<T> {
  return (await (await ghRes(path)).json()) as T;
}

/** Dosya içeriği (sabit commit'ten). Sadece raw.githubusercontent.com, yol parça parça kodlanır. */
export async function rawFile(owner: string, repo: string, sha: string, path: string, maxBytes = 200_000) {
  if (!OWNER.test(owner) || !REPO.test(repo) || !SHA.test(sha) || path.includes("..")) return null;
  const enc = path.split("/").map(encodeURIComponent).join("/");
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${enc}`, { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "tltpulse" } });
    if (!r.ok) return null;
    const text = await r.text();
    return text.slice(0, maxBytes);
  } catch {
    return null;
  }
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

// ---------- Dosya sınıflandırma ----------

/** Puana ve kopya kontrolüne girmeyenler: bağımlılıklar, derleme çıktısı, lock dosyaları, resimler, üretilmiş dosyalar. */
const IGNORED_DIR = /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|\.svelte-kit|\.output|vendor|coverage|target|bin|obj|\.git|__pycache__|\.venv|venv|env|Pods|\.gradle|\.idea|\.vscode|\.dart_tool|\.expo|generated)\//i;
const IGNORED_FILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|composer\.lock|Gemfile\.lock|poetry\.lock|Cargo\.lock|go\.sum|Podfile\.lock|pubspec\.lock|\.DS_Store)$|\.min\.(js|css)$|\.map$|\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|psd|mp4|mov|mp3|wav|ogg|webm|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|tar|rar|7z|jar|war|exe|dll|so|dylib|class|o|a|bin|db|sqlite3?|lock)$/i;
export const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte|astro|py|go|java|kt|kts|swift|dart|rb|php|cs|rs|c|cc|cpp|h|hpp|m|mm|scala|sql|html|css|scss|sass|less|sh|ex|exs|lua|r|ipynb|graphql|prisma|proto)$/i;
const TEST_PATH = /(^|\/)(tests?|__tests__|specs?|e2e|cypress)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py|rb)$|(^|\/)test_[^/]+\.py$|Tests?\.(java|kt|cs|swift)$/i;
const CI_PATH = /^(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.yml|\.circleci\/config\.yml|azure-pipelines\.yml|Jenkinsfile|\.travis\.yml)$/i;
const README = /^readme(\.[a-z]+)?$/i;

export const counted = (path: string, size: number) => size >= 20 && !IGNORED_DIR.test(path) && !IGNORED_FILE.test(path);

export interface TreeFile {
  path: string;
  sha: string;
  size: number;
}

const DEP_TECH: Record<string, string> = {
  react: "React", next: "Next.js", vue: "Vue", nuxt: "Nuxt", svelte: "Svelte", "@sveltejs/kit": "SvelteKit", "@angular/core": "Angular", express: "Express",
  fastify: "Fastify", "@nestjs/core": "NestJS", koa: "Koa", hono: "Hono", "socket.io": "Socket.IO", ws: "WebSocket", prisma: "Prisma", "@prisma/client": "Prisma",
  pg: "PostgreSQL", postgres: "PostgreSQL", mysql2: "MySQL", mysql: "MySQL", mongoose: "MongoDB", mongodb: "MongoDB", redis: "Redis", ioredis: "Redis",
  "@supabase/supabase-js": "Supabase", firebase: "Firebase", "firebase-admin": "Firebase", tailwindcss: "Tailwind", graphql: "GraphQL", "@apollo/server": "GraphQL",
  jest: "Jest", vitest: "Vitest", "@playwright/test": "Playwright", cypress: "Cypress", "react-native": "React Native", expo: "Expo", electron: "Electron",
  "drizzle-orm": "Drizzle", sequelize: "Sequelize", typeorm: "TypeORM", bullmq: "BullMQ", bull: "Bull", kafkajs: "Kafka", amqplib: "RabbitMQ", three: "Three.js",
  d3: "D3", "chart.js": "Chart.js", stripe: "Stripe", zod: "Zod", redux: "Redux", "@reduxjs/toolkit": "Redux", zustand: "Zustand", "@tanstack/react-query": "React Query",
  typescript: "TypeScript", vite: "Vite", leaflet: "Leaflet", mapbox: "Mapbox",
};

function techsFrom(langs: Record<string, number>, deps: string[], paths: string[]) {
  const out: string[] = [];
  const add = (t: string) => !out.some((x) => x.toLowerCase() === t.toLowerCase()) && out.push(t);
  for (const [l] of Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 4)) if (!/^(HTML|CSS|SCSS|Shell|Makefile|Dockerfile|Procfile|Batchfile)$/.test(l)) add(l);
  for (const d of deps) if (DEP_TECH[d]) add(DEP_TECH[d]);
  if (paths.some((p) => /(^|\/)(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i.test(p))) add("Docker");
  if (paths.some((p) => /^\.github\/workflows\//.test(p))) add("GitHub Actions");
  if (paths.some((p) => /(^|\/)pubspec\.yaml$/.test(p))) add("Flutter");
  if (paths.some((p) => /\.tf$/.test(p))) add("Terraform");
  if (paths.some((p) => /(^|\/)(k8s|kubernetes|helm)\//i.test(p))) add("Kubernetes");
  return out.slice(0, 12);
}

// ---------- Repo bilgisi ----------

export interface RepoInfo {
  owner: string;
  repo: string;
  fork: boolean;
  private: boolean;
  defaultBranch: string;
  createdAt: string;
  language: string | null;
}

export async function repoInfo(owner: string, repo: string): Promise<RepoInfo> {
  if (!OWNER.test(owner) || !REPO.test(repo)) throw new GitHubError("Geçerli bir GitHub repo linki gir: github.com/kullanici/repo");
  const i = await gh<{ fork: boolean; private: boolean; default_branch: string; language: string | null; full_name: string; created_at: string }>(`/repos/${owner}/${repo}`);
  const [o, r] = i.full_name.split("/");
  return { owner: o, repo: r, fork: i.fork, private: i.private, defaultBranch: i.default_branch, createdAt: i.created_at, language: i.language };
}

/** Son commit ve toplam commit sayısı (Link başlığındaki son sayfa, sayfa başı 1). */
export async function headCommit(owner: string, repo: string, ref: string) {
  const r = await ghRes(`/repos/${owner}/${repo}/commits?per_page=1&sha=${encodeURIComponent(ref)}`);
  const list = (await r.json()) as { sha: string }[];
  if (!list.length) throw new GitHubError("Repo boş görünüyor; önce kodunu push et.");
  const last = r.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  return { sha: list[0].sha, count: last ? Number(last[1]) : 1 };
}

export async function treeAt(owner: string, repo: string, sha: string): Promise<TreeFile[]> {
  const t = await gh<{ tree: { path: string; type: string; sha: string; size?: number }[] }>(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);
  return t.tree.filter((f) => f.type === "blob").map((f) => ({ path: f.path, sha: f.sha, size: f.size ?? 0 }));
}

/** En eski commit'teki dosyaların blob özetleri (içe aktarılmış kod oranı için). */
async function firstCommitShas(owner: string, repo: string, ref: string, count: number): Promise<Set<string> | "all"> {
  if (count <= 1) return "all";
  const oldest = await gh<{ sha: string }[]>(`/repos/${owner}/${repo}/commits?per_page=1&sha=${encodeURIComponent(ref)}&page=${count}`);
  if (!oldest[0]) return new Set();
  const c = await gh<{ files?: { sha: string | null; status: string }[] }>(`/repos/${owner}/${repo}/commits/${oldest[0].sha}`);
  return new Set((c.files ?? []).filter((f) => f.sha && f.status !== "removed").map((f) => f.sha!));
}

/** Testler CI'da çalışıp yeşil geçti mi (son commit'in check run'ları; yoksa commit durumu). */
export async function ciGreen(owner: string, repo: string, sha: string) {
  try {
    const runs = await gh<{ total_count: number; check_runs: { status: string; conclusion: string | null }[] }>(`/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`);
    const done = runs.check_runs.filter((r) => r.status === "completed");
    if (done.length) return done.some((r) => r.conclusion === "success") && done.every((r) => ["success", "skipped", "neutral"].includes(r.conclusion ?? ""));
    const st = await gh<{ state: string; total_count: number }>(`/repos/${owner}/${repo}/commits/${sha}/status`);
    return st.total_count > 0 && st.state === "success";
  } catch {
    return false;
  }
}

/** Kullanıcının commit attığı farklı gün sayısı (en fazla 3 sayfa, 300 commit). */
async function commitDays(owner: string, repo: string, ref: string, author: string) {
  const days = new Set<string>();
  for (let page = 1; page <= 3; page++) {
    const list = await gh<{ commit: { author: { date: string } | null } }[]>(
      `/repos/${owner}/${repo}/commits?per_page=100&page=${page}&sha=${encodeURIComponent(ref)}&author=${encodeURIComponent(author)}`,
    ).catch(() => []);
    for (const c of list) if (c.commit.author?.date) days.add(new Date(c.commit.author.date).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }));
    if (list.length < 100) break;
  }
  return days.size;
}

/** Commit'lerin yazara göre dağılımı ve günleri (yarışma takım çalışması için). */
export async function commitsBetween(owner: string, repo: string, ref: string, since: string, until: string) {
  const out: { login: string; date: string }[] = [];
  for (let page = 1; page <= 5; page++) {
    const list = await gh<{ author: { login: string } | null; commit: { author: { date: string } | null } }[]>(
      `/repos/${owner}/${repo}/commits?per_page=100&page=${page}&sha=${encodeURIComponent(ref)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
    );
    for (const c of list) out.push({ login: c.author?.login?.toLowerCase() ?? "", date: c.commit.author?.date ?? "" });
    if (list.length < 100) break;
  }
  return out;
}

// ---------- Proje için GitHub'dan okunanlar ----------

export interface RepoFacts {
  owner: string;
  repo: string;
  sha: string;
  language: string;
  authorship: number;
  commits: number;
  commitDays: number;
  role: "Tek başıma" | "Takımla";
  techs: string[];
  /** Repodaki bütün dosya yolları (AI gerekçesindeki dosyaları doğrulamak için) */
  allPaths: Set<string>;
  /** Sayılan dosyalar (bağımlılık, derleme çıktısı, resim hariç) */
  files: TreeFile[];
  firstCommit: Set<string> | "all";
  readme: TreeFile | null;
  hasTests: boolean;
  hasCi: boolean;
  ciGreen: boolean;
  deps: string[];
}

export type FactsOutcome = { ok: true; facts: RepoFacts } | { ok: false; reason: string; kind: "fork" | "yazarlık" | "erişim" };

/** Puanlama dışındaki her şey: repo, yazarlık, dosya ağacı, ilk commit, CI, commit günleri, teknolojiler. */
export async function repoFacts(owner: string, repo: string, githubUser: string): Promise<FactsOutcome> {
  try {
    const info = await repoInfo(owner, repo);
    if (info.private) return { ok: false, kind: "erişim", reason: "Sadece herkese açık repolar eklenebilir." };
    if (info.fork) return { ok: false, kind: "fork", reason: "Fork'lar eklenemez; kendi yazdığın repoyu ekle." };
    const { owner: o, repo: r } = info;

    const [langs, contributors, head] = await Promise.all([
      gh<Record<string, number>>(`/repos/${o}/${r}/languages`),
      gh<{ login?: string; contributions: number; type: string }[]>(`/repos/${o}/${r}/contributors?per_page=100&anon=1`).catch(() => []),
      headCommit(o, r, info.defaultBranch),
    ]);

    const total = contributors.reduce((a, c) => a + c.contributions, 0);
    const mine = contributors.filter((c) => c.login?.toLowerCase() === githubUser.toLowerCase()).reduce((a, c) => a + c.contributions, 0);
    const authorship = total ? Math.round((mine / total) * 100) : 0;
    if (authorship < MIN_AUTHORSHIP)
      return { ok: false, kind: "yazarlık", reason: `Bu repodaki commit'lerin %${authorship}'i senin (@${githubUser}). Eklemek için en az %${MIN_AUTHORSHIP} olmalı.` };

    const [tree, first, green, days] = await Promise.all([
      treeAt(o, r, head.sha),
      firstCommitShas(o, r, info.defaultBranch, head.count).catch(() => new Set<string>()),
      ciGreen(o, r, head.sha),
      commitDays(o, r, info.defaultBranch, githubUser),
    ]);
    const paths = tree.map((f) => f.path);
    const pkg = tree.find((f) => f.path === "package.json");
    let deps: string[] = [];
    if (pkg) {
      try {
        const j = JSON.parse((await rawFile(o, r, head.sha, "package.json", 100_000)) ?? "{}") as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        deps = [...Object.keys(j.dependencies ?? {}), ...Object.keys(j.devDependencies ?? {})].slice(0, 200);
      } catch {
        deps = [];
      }
    }
    const hasTests = paths.some((p) => TEST_PATH.test(p));
    const hasCi = paths.some((p) => CI_PATH.test(p));
    const humans = contributors.filter((c) => c.type === "User" && !/\[bot\]$/i.test(c.login ?? ""));

    return {
      ok: true,
      facts: {
        owner: o,
        repo: r,
        sha: head.sha,
        language: info.language ?? Object.keys(langs)[0] ?? "",
        authorship,
        commits: head.count,
        commitDays: days,
        role: humans.length > 1 ? "Takımla" : "Tek başıma",
        techs: techsFrom(langs, deps, paths),
        allPaths: new Set(paths),
        files: tree.filter((f) => counted(f.path, f.size)).sort((a, b) => a.path.localeCompare(b.path)).slice(0, 4000),
        firstCommit: first,
        readme: tree.find((f) => README.test(f.path)) ?? null,
        hasTests,
        hasCi,
        ciGreen: hasTests && hasCi && green,
        deps,
      },
    };
  } catch (e) {
    if (e instanceof GitHubError) return { ok: false, kind: "erişim", reason: e.message };
    console.error("[github]", e instanceof Error ? e.message : e);
    return { ok: false, kind: "erişim", reason: "GitHub'a ulaşılamadı. Biraz sonra tekrar dene." };
  }
}

/** Şablon dışı kendi dosyaları, kaynak dosyaları ve içe aktarılmış kod oranı. */
export function ownership(files: TreeFile[], templates: Set<string>, first: Set<string> | "all") {
  const own = files.filter((f) => !templates.has(f.sha));
  const source = own.filter((f) => SOURCE_FILE.test(f.path));
  const bytes = source.reduce((a, f) => a + f.size, 0);
  const imported = first === "all" ? bytes : source.filter((f) => first.has(f.sha)).reduce((a, f) => a + f.size, 0);
  return { own, source, importedRatio: bytes ? imported / bytes : 0, enough: source.length >= MIN_OWN_FILES };
}

export const meaningfulReadme = (readme: TreeFile | null, templates: Set<string>) => !!readme && readme.size >= MIN_README_CHARS && !templates.has(readme.sha);
