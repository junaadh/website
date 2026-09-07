import { authenticated, ensureSchema, json } from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import { revertConfig } from "../../lib/store";

/** Steps the pointer back one version. The blobs themselves are never deleted. */
export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return json({ error: "not signed in" }, 401);

  const version = await revertConfig(env);
  return version === null
    ? json({ error: "no earlier version to revert to" }, 409)
    : json({ version, reverted: true });
};
