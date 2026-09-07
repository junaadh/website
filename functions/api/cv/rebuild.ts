import { allow, authenticated, ensureSchema, json } from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import { readConfig } from "../../lib/store";
import profileSeed from "../../../src/data/profile.json";
import type { Profile } from "../../../shared/config";

type CvEnv = AuthEnv & {
  /** Fine-grained PAT: this repository only, Actions read+write, nothing else.
      Deliberately separate from the stats token, which needs no repo access —
      neither can do the other's job if it leaks. */
  GITHUB_CV_TOKEN?: string;
  /** Repo name override; the owner comes from the profile's GitHub URL. */
  GITHUB_REPO?: string;
};

/**
 * Re-renders just the PDF. Typst is a native binary and its WASM build is
 * ~10 MB gzipped, past the Workers limit, so the render happens in CI.
 *
 * This dispatches `cv.yml`, which renders from the published config and uploads
 * to R2 — it does not build or deploy the site. A deploy hook was the obvious
 * alternative and is deliberately not used: it would rebuild and redeploy
 * everything to change a line of text.
 *
 * The cost of being targeted is a credential, because `workflow_dispatch`
 * requires one. A fine-grained PAT scoped to this repository with
 * Actions: write is enough.
 */
export const onRequestPost: PagesFunction<CvEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return json({ error: "not signed in" }, 401);

  // A session is not a licence to hammer CI.
  if (!(await allow(env, request, "cv-rebuild", 6, 3600)))
    return json({ error: "too many rebuilds; try again later" }, 429);

  if (!env.GITHUB_CV_TOKEN)
    return json(
      {
        error:
          "GITHUB_CV_TOKEN is not set. A fine-grained PAT limited to this repository with Actions: read and write enables CV rebuilds.",
      },
      503,
    );

  // Owner comes from the profile's own GitHub URL; only the repo name is config.
  const published = await readConfig(env);
  const profile = published?.config.profile ?? (profileSeed as Profile);
  const owner = new URL(profile.github).pathname.replace(/^\/|\/$/g, "");
  /* The profile is admin-editable, so its GitHub URL is not trusted to build an
     API path — a crafted owner could redirect the dispatch elsewhere. */
  if (!/^[A-Za-z0-9-]+$/.test(owner))
    return json({ error: "profile.github is not a plain user URL" }, 422);
  const repo = env.GITHUB_REPO ?? `${owner}/website`;
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo))
    return json({ error: "GITHUB_REPO must be owner/repo" }, 422);

  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/cv.yml/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_CV_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        // GitHub rejects requests without one.
        "user-agent": "junaadh.dev-admin",
      },
      body: JSON.stringify({ ref: "master", inputs: { reason: "admin panel" } }),
    },
  );
  if (response.status !== 204)
    return json(
      {
        error: `GitHub returned ${response.status}`,
        detail: await response.text(),
      },
      502,
    );

  return json({
    queued: true,
    note: "Rendering the PDF only — the site is not redeployed. /cv.pdf updates when the run finishes.",
  });
};
