import { allow, authenticated, ensureSchema, json } from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";

/** Bumps the stats version so every cached card variant misses at once. */
export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return json({ error: "not signed in" }, 401);
  // Each bump costs a GitHub API round trip on the next render.
  if (!(await allow(env, request, "stats-invalidate", 12, 3600)))
    return json({ error: "too many invalidations; try again later" }, 429);

  const current = Number((await env.CONFIG.get("stats:version")) ?? "1");
  const next = Number.isFinite(current) ? current + 1 : 2;
  await env.CONFIG.put("stats:version", String(next));
  return json({
    version: next,
    note: "Cards re-render on next request. GitHub's image proxy may still serve a stale copy for a while.",
  });
};
