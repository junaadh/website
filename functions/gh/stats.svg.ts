import type { Env } from "../lib/store";
import { readConfig } from "../lib/store";
import { fetchStats, renderCard } from "../lib/gh-stats";
import profileSeed from "../../src/data/profile.json";
import type { Profile } from "../../shared/config";

type StatsEnv = Env & {
  /* GitHub's GraphQL API has no anonymous access, so a token is unavoidable.
     To include private repositories it needs `Metadata: Read-only` on them —
     which grants names, languages and stars, and explicitly *not* code, issues,
     PRs, Actions or secrets. Kept separate from the CV token so neither can do
     the other's job. */
  GITHUB_STATS_TOKEN?: string;
  /** Set to "false" to keep the card public-only even with a broader token. */
  GITHUB_STATS_PRIVATE?: string;
};

const DAY = 86400;

/**
 * A stats card for the GitHub profile README, not for this site.
 *
 *   ![stats](https://junaadh.dev/gh/stats.svg?theme=dark)
 *
 * The login comes from the published profile's GitHub URL, so it follows the
 * site rather than being hardcoded. `?user=` overrides it.
 *
 * Rendered at most once a day per variant. The panel's invalidate button bumps
 * `stats:version`, which changes the key and forces a re-render. That
 * guarantees a fresh render, not a fresh fetch by GitHub — README images go
 * through camo, which caches on its own schedule.
 */
export const onRequestGet: PagesFunction<StatsEnv> = async ({ request, env }) => {
  const url = new URL(request.url);

  let login = url.searchParams.get("user");
  if (!login) {
    const published = await readConfig(env);
    const profile = published?.config.profile ?? (profileSeed as Profile);
    login = new URL(profile.github).pathname.replace(/^\/|\/$/g, "");
  }
  login = login.slice(0, 39);
  /* Errors must never be cached: a transient GitHub failure would otherwise
     leave a broken image in the README until the entry expired. */
  const uncached = { "cache-control": "no-store" };
  if (!/^[A-Za-z0-9-]+$/.test(login))
    return new Response("bad user", { status: 400, headers: uncached });

  const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";
  const includePrivate = env.GITHUB_STATS_PRIVATE !== "false";
  const version =
    (await env.CONFIG?.get("stats:version", { cacheTtl: 60 })) ?? "1";
  const key = `stats:v${version}:${login}:${theme}:${includePrivate ? "all" : "public"}`;

  const headers = {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": `public, max-age=${DAY}, stale-while-revalidate=${DAY}`,
  };

  const cached = await env.CONFIG?.get(key, { cacheTtl: DAY });
  if (cached) return new Response(cached, { headers });

  if (!env.GITHUB_STATS_TOKEN)
    return new Response("GITHUB_STATS_TOKEN is not configured", {
      status: 503,
      headers: uncached,
    });

  try {
    const svg = renderCard(await fetchStats(login, env.GITHUB_STATS_TOKEN, includePrivate), theme);
    // expirationTtl bounds staleness even if the version never moves.
    await env.CONFIG?.put(key, svg, { expirationTtl: DAY });
    return new Response(svg, { headers });
  } catch (error) {
    return new Response(`could not render: ${(error as Error).message}`, {
      status: 502,
      headers: uncached,
    });
  }
};
