import { readConfig } from "../lib/store";
import { authenticated, ensureSchema } from "../lib/auth";
import type { AuthEnv } from "../lib/auth";

type HealthEnv = AuthEnv & {
  MEDIA?: R2Bucket;
  GITHUB_CV_TOKEN?: string;
  GITHUB_STATS_TOKEN?: string;
  /** Injected by Pages for Git-integrated builds; absent on direct uploads. */
  CF_PAGES_COMMIT_SHA?: string;
  CF_PAGES_BRANCH?: string;
};

/**
 * Answers "is this deployment wired up?" without guessing — but the detail is
 * reconnaissance, so only a session gets it.
 *
 * Anonymous callers get a single boolean: enough for an uptime check, and it
 * names no binding, no secret, no commit and no colo. Signed in, every store is
 * actually touched rather than assumed, so a binding that is present but broken
 * reports false instead of true.
 */
export const onRequestGet: PagesFunction<HealthEnv> = async ({
  request,
  env,
}) => {
  const started = Date.now();
  const headers = { "cache-control": "no-store" };

  const probe = async (run: () => Promise<unknown>) => {
    try {
      await run();
      return true;
    } catch {
      return false;
    }
  };

  const kv = env.CONFIG ? await probe(() => env.CONFIG.get("config:version")) : null;
  const d1 = env.AUTH ? await probe(() => env.AUTH.prepare("SELECT 1").first()) : null;
  const ok = kv === true && d1 === true;

  await ensureSchema(env.AUTH).catch(() => {});
  if (!(await authenticated(request, env).catch(() => false)))
    return Response.json({ ok }, { status: ok ? 200 : 503, headers });

  const r2 = env.MEDIA ? await probe(() => env.MEDIA!.head("cv.pdf")) : null;
  const published = kv ? await readConfig(env) : null;
  const cv = env.MEDIA ? await env.MEDIA.head("cv.pdf").catch(() => null) : null;

  return Response.json(
    {
      ok,
      deployment: {
        commit: env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ?? null,
        branch: env.CF_PAGES_BRANCH ?? null,
        colo: (request as { cf?: { colo?: string } }).cf?.colo ?? null,
      },
      // null = not bound at all, false = bound but unreachable.
      bindings: { config: kv, auth: d1, media: r2 },
      secrets: {
        bootstrap: !!env.BOOTSTRAP_JWT_SECRET,
        cvToken: !!env.GITHUB_CV_TOKEN,
        statsToken: !!env.GITHUB_STATS_TOKEN,
      },
      content: {
        publishedVersion: published?.version ?? 0,
        source: published ? "published" : "built-in",
      },
      cv: {
        source: cv ? "generated" : "deployment",
        uploaded: cv?.uploaded ?? null,
        size: cv?.size ?? null,
      },
      tookMs: Date.now() - started,
    },
    { headers },
  );
};
