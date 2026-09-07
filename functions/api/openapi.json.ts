import { authenticated, ensureSchema, json } from "../lib/auth";
import type { AuthEnv } from "../lib/auth";
import { openapi } from "../lib/openapi";

/** The spec. Point Bruno, Insomnia, Postman or your own client at it. */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return json({ error: "not signed in", hint: "sign in at /admin first" }, 401);

  return json(openapi(new URL(request.url).origin), 200, {
    "cache-control": "no-store",
  });
};
