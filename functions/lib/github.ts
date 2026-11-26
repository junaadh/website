// GitHub profile data for the card API.
//
// With GITHUB_TOKEN (a Pages secret) it asks the GraphQL API for everything.
// A fine-grained token with no extra scopes is enough: only public data is
// requested (public repositories, the public contribution calendar), and
// private repositories are never counted. Without a token it falls back to the
// REST API, which has no contribution data, so those fields are 0 and `days`
// is empty. Callers can tell the two apart by `source`.

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

const QUERY = `query($login:String!, $since:DateTime!){
  user(login:$login){
    login name bio location createdAt avatarUrl(size:160)
    followers{totalCount} following{totalCount}
    pullRequests{totalCount} issues{totalCount}
    repositoriesContributedTo(first:1, contributionTypes:[COMMIT,PULL_REQUEST,REPOSITORY,ISSUE]){totalCount}
    repositories(ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){totalCount}
    owned: repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, orderBy:{field:STARGAZERS, direction:DESC}){
      nodes{
        name description stargazerCount forkCount primaryLanguage{name}
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

async function viaGraphql(login: string, token: string): Promise<CardUser> {
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString();
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login, since } }),
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
    top: u.owned.nodes.slice(0, 6).map((r) => ({
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

async function viaRest(login: string): Promise<CardUser> {
  const path = encodeURIComponent(login);
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
    const seen = sizes.get(r.language);
    const size = Math.max(1, r.size); // the repo's size stands in for per-language bytes
    if (seen) seen.size += size;
    else sizes.set(r.language, { color: COLORS[r.language] ?? FALLBACK_COLOR, size });
  }
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
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
    commits: 0,
    pullRequests: 0,
    issues: 0,
    contributedTo: 0,
    joined: Number(u.created_at.slice(0, 4)) || 0,
    contributions: 0,
    days: [],
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

export async function fetchCardUser(login: string, token?: string): Promise<Fetched> {
  const source = token ? "graphql" : "rest";
  const user = token ? await viaGraphql(login, token) : await viaRest(login);
  user.avatar = await inlineAvatar(user.avatar);
  return { user, source };
}
