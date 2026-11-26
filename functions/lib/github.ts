// GitHub profile data for the card API.
//
// With GITHUB_TOKEN (a Pages secret) it asks the GraphQL API for everything.
// A fine-grained token with no extra scopes is enough: only public data is
// requested (public repositories, the public contribution calendar), and
// private repositories are never counted. Without a token it falls back to
// public, unauthenticated endpoints: the REST API for profile and repositories,
// the search API for commit / PR / issue totals, and the public contributions
// page for the calendar. Each of those extras fails soft (0 / empty) so one
// rate limit never breaks the card; only `contributedTo` has no public source
// and stays 0. Callers can tell the two paths apart by `source`.

import type { CardUser } from "../../lib/card/types";

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Fetched {
  user: CardUser;
  source: "graphql" | "rest";
}

const API = "https://api.github.com";
const AVATAR_HOST = "avatars.githubusercontent.com";
const MAX_AVATAR_BYTES = 100 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const headers = (token?: string): HeadersInit => ({
  "user-agent": "junaadh.com-card",
  accept: "application/vnd.github+json",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

const get = (url: string, token?: string) =>
  fetch(url, { headers: headers(token), signal: AbortSignal.timeout(8000) });

const query = (privacy: string) => `query($login:String!, $since:DateTime!){
  user(login:$login){
    login name bio location createdAt avatarUrl(size:160)
    followers{totalCount} following{totalCount}
    pullRequests{totalCount} issues{totalCount}
    repositoriesContributedTo(first:1, contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY,ISSUE]){totalCount}
    repositories(ownerAffiliations:OWNER, isFork:false${privacy}){totalCount}
    owned: repositories(first:100, ownerAffiliations:OWNER, isFork:false${privacy}, orderBy:{field:STARGAZERS, direction:DESC}){
      nodes{
        name description isPrivate stargazerCount forkCount primaryLanguage{name}
        languages(first:8, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name color } } }
      }
    }
    year: contributionsCollection(from:$since){ totalCommitContributions }
    contributionsCollection{
      contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount } } }
    }
  }
}`;

interface GqlUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  avatarUrl: string;
  followers: { totalCount: number };
  following: { totalCount: number };
  pullRequests: { totalCount: number };
  issues: { totalCount: number };
  repositoriesContributedTo: { totalCount: number };
  repositories: { totalCount: number };
  owned: {
    nodes: {
      name: string;
      description: string | null;
      isPrivate: boolean;
      stargazerCount: number;
      forkCount: number;
      primaryLanguage: { name: string } | null;
      languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
    }[];
  };
  year: { totalCommitContributions: number };
  contributionsCollection: {
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: { contributionCount: number }[] }[];
    };
  };
}

const FALLBACK_COLOR = "#8b949e";
const clean = (s: string | null | undefined, max: number) => (s ?? "").slice(0, max);

/** Language sizes -> the top 8 with shares that sum to 1. */
function topLanguages(sizes: Map<string, { color: string; size: number }>) {
  const ranked = [...sizes.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 8);
  const total = ranked.reduce((sum, [, v]) => sum + v.size, 0) || 1;
  return ranked.map(([name, v]) => ({ name, color: v.color, share: v.size / total }));
}

/**
 * With includePrivate (set only for the site owner's login), private repos the
 * token can see count toward repos, stars and languages. Their names
 * and descriptions never reach the card: the top list is public repos only.
 */
async function viaGraphql(
  login: string,
  token: string,
  includePrivate: boolean,
): Promise<CardUser> {
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString();
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({
      query: query(includePrivate ? "" : ", privacy:PUBLIC"),
      variables: { login, since },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) throw new GitHubError(502, "GITHUB_TOKEN was rejected by GitHub");
  if (!res.ok) throw new GitHubError(502, `GitHub returned ${res.status}`);
  const payload = (await res.json()) as {
    errors?: { type?: string; message: string }[];
    data?: { user: GqlUser | null };
  };
  if (
    payload.errors?.some((e) => e.type === "NOT_FOUND") ||
    (!payload.errors && !payload.data?.user)
  ) {
    throw new GitHubError(404, `No GitHub user "${login}"`);
  }
  const u = payload.data?.user;
  if (payload.errors?.length || !u)
    throw new GitHubError(502, "GitHub could not answer that query");

  const sizes = new Map<string, { color: string; size: number }>();
  let stars = 0;
  let forks = 0;
  for (const repo of u.owned.nodes) {
    stars += repo.stargazerCount;
    forks += repo.forkCount;
    for (const edge of repo.languages.edges) {
      const seen = sizes.get(edge.node.name);
      if (seen) seen.size += edge.size;
      else sizes.set(edge.node.name, { color: edge.node.color ?? FALLBACK_COLOR, size: edge.size });
    }
  }
  const calendar = u.contributionsCollection.contributionCalendar;
  const days = calendar.weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount));
  return {
    login: u.login,
    name: clean(u.name, 80) || u.login,
    bio: clean(u.bio, 200),
    location: clean(u.location, 80),
    followers: u.followers.totalCount,
    following: u.following.totalCount,
    repos: u.repositories.totalCount,
    stars,
    forks,
    commits: u.year.totalCommitContributions,
    pullRequests: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    contributedTo: u.repositoriesContributedTo.totalCount,
    joined: Number(u.createdAt.slice(0, 4)) || 0,
    contributions: calendar.totalContributions,
    days: days.slice(-371),
    languages: topLanguages(sizes),
    top: u.owned.nodes
      .filter((r) => !r.isPrivate)
      .slice(0, 6)
      .map((r) => ({
        name: r.name,
        description: clean(r.description, 160),
        language: r.primaryLanguage?.name ?? "",
        stars: r.stargazerCount,
        forks: r.forkCount,
      })),
    avatar: u.avatarUrl, // swapped for a data: URL by fetchCardUser
  };
}

// REST has no language colours; these are GitHub's for the common ones.
const COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Rust: "#dea584",
  Go: "#00add8",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Lua: "#000080",
  Zig: "#ec915c",
  Nix: "#7e7eff",
  Dart: "#00b4ab",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

interface RestUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
  avatar_url: string;
  followers: number;
  following: number;
}
interface RestRepo {
  name: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  size: number;
}

const MONTHS_DAYS = 371;
const PUBLIC_TIMEOUT = 6000;

const attr = (tag: string, name: string) =>
  new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`)
    .exec(tag)
    ?.slice(1)
    .find((v) => v !== undefined);

/**
 * The public contribution calendar (no token): day cells carry data-date and
 * data-level, and a <tool-tip for="cell id"> beside each holds "N contributions
 * on ...". Counts fall back to a level-based estimate if the tooltips are gone.
 * Empty on any failure.
 */
export function parseCalendar(html: string): { days: number[]; total: number } {
  const labels = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g)) {
    const id = attr(m[1] ?? "", "for");
    const text = (m[2] ?? "").trim();
    const count = /^No contributions/i.test(text)
      ? 0
      : /^([\d,]+)\s+contributions?\b/i.exec(text)?.[1];
    if (id && count !== undefined)
      labels.set(id, typeof count === "number" ? count : Number(count.replace(/,/g, "")));
  }
  const cells: { date: string; count: number }[] = [];
  const LEVEL_ESTIMATE = [0, 2, 5, 9, 14];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = attr(tag, "data-date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/ContributionCalendar-day/.test(tag))
      continue;
    const id = attr(tag, "id") ?? "";
    const level = Math.min(4, Math.max(0, Number(attr(tag, "data-level")) || 0));
    cells.push({ date, count: labels.get(id) ?? LEVEL_ESTIMATE[level] ?? 0 });
  }
  cells.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const days = cells.slice(-MONTHS_DAYS).map((c) => c.count);
  const header = /([\d,]+)\s+contributions\s+in\s+the\s+last\s+year/i.exec(html)?.[1];
  const sum = days.reduce((a, b) => a + b, 0);
  return { days, total: header && labels.size > 0 ? Number(header.replace(/,/g, "")) : sum };
}

async function publicCalendar(login: string): Promise<{ days: number[]; total: number }> {
  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
      headers: { "user-agent": "junaadh.com-card", accept: "text/html" },
      signal: AbortSignal.timeout(PUBLIC_TIMEOUT),
    });
    if (!res.ok) return { days: [], total: 0 };
    return parseCalendar(await res.text());
  } catch {
    return { days: [], total: 0 };
  }
}

/** total_count of a search query; 0 on a rate limit, validation error or network failure. */
async function searchTotal(kind: "commits" | "issues", q: string): Promise<number> {
  try {
    const res = await fetch(`${API}/search/${kind}?q=${q}&per_page=1`, {
      headers: headers(),
      signal: AbortSignal.timeout(PUBLIC_TIMEOUT),
    });
    if (!res.ok) return 0;
    const n = ((await res.json()) as { total_count?: number }).total_count;
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}

async function viaRest(login: string): Promise<CardUser> {
  const path = encodeURIComponent(login);
  const year = new Date().getUTCFullYear();
  const who = encodeURIComponent(login);
  // The extras never reject, so they cannot fail the card.
  const extras = Promise.all([
    publicCalendar(login),
    // user: keeps it to repos the login owns; without it every fork of a
    // popular repo counts the same commits again.
    searchTotal("commits", `author:${who}+user:${who}+author-date:>=${year}-01-01`),
    searchTotal("issues", `author:${who}+type:pr`),
    searchTotal("issues", `author:${who}+type:issue`),
  ]);
  const [uRes, rRes] = await Promise.all([
    get(`${API}/users/${path}`),
    get(`${API}/users/${path}/repos?type=owner&per_page=100&sort=pushed`),
  ]);
  if (uRes.status === 404) throw new GitHubError(404, `No GitHub user "${login}"`);
  if (uRes.status === 403 || uRes.status === 429) {
    throw new GitHubError(502, "GitHub's anonymous rate limit was hit; set GITHUB_TOKEN");
  }
  if (!uRes.ok || !rRes.ok)
    throw new GitHubError(502, `GitHub returned ${uRes.status}/${rRes.status}`);
  const u = (await uRes.json()) as RestUser;
  const repos = ((await rRes.json()) as RestRepo[]).filter((r) => !r.fork);

  const sizes = new Map<string, { color: string; size: number }>();
  let stars = 0;
  let forks = 0;
  for (const r of repos) {
    stars += r.stargazers_count;
    forks += r.forks_count;
    if (!r.language) continue;
    // REST has no per-language bytes, and a repo's size counts its whole
    // history and assets (a dotfiles repo full of images would win), so each
    // repo votes once for its primary language instead.
    const seen = sizes.get(r.language);
    if (seen) seen.size += 1;
    else sizes.set(r.language, { color: COLORS[r.language] ?? FALLBACK_COLOR, size: 1 });
  }
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  const [calendar, commits, pullRequests, issues] = await extras;
  return {
    login: u.login,
    name: clean(u.name, 80) || u.login,
    bio: clean(u.bio, 200),
    location: clean(u.location, 80),
    followers: u.followers,
    following: u.following,
    repos: repos.length,
    stars,
    forks,
    commits,
    pullRequests,
    issues,
    contributedTo: 0, // no public source without a token
    joined: Number(u.created_at.slice(0, 4)) || 0,
    contributions: calendar.total,
    days: calendar.days,
    languages: topLanguages(sizes),
    top: top.map((r) => ({
      name: r.name,
      description: clean(r.description, 160),
      language: r.language ?? "",
      stars: r.stargazers_count,
      forks: r.forks_count,
    })),
    avatar: u.avatar_url,
  };
}

/** The avatar as a data: URL, or "" if it is not GitHub's, not a raster, or over 100 KB. */
async function inlineAvatar(url: string): Promise<string> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== AVATAR_HOST) return "";
    parsed.searchParams.set("s", "160");
    const res = await fetch(parsed, { signal: AbortSignal.timeout(5000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!res.ok || !AVATAR_TYPES.includes(type)) return "";
    const length = Number(res.headers.get("content-length"));
    if (length > MAX_AVATAR_BYTES) return "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_AVATAR_BYTES) return "";
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return "";
  }
}

export async function fetchCardUser(
  login: string,
  token?: string,
  includePrivate = true,
): Promise<Fetched> {
  const source = token ? "graphql" : "rest";
  const user = token ? await viaGraphql(login, token, includePrivate) : await viaRest(login);
  user.avatar = await inlineAvatar(user.avatar);
  return { user, source };
}
