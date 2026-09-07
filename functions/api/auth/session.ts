import {
  authenticated,
  bootstrapOpen,
  credentialCount,
  destroySession,
  ensureSchema,
  getState,
  json,
  listCredentials,
  sessionCookie,
} from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";

/** What the panel asks on load to decide which screen to show. */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  const signedIn = await authenticated(request, env);
  return json({
    authenticated: signedIn,
    credentials: signedIn ? (await listCredentials(env)).results : undefined,
    registered: await credentialCount(env),
    totpEnrolled: (await getState(env, "totp_enrolled")) === "yes",
    bootstrapOpen: await bootstrapOpen(env),
  });
};

export const onRequestDelete: PagesFunction<AuthEnv> = async ({
  request,
  env,
}) => {
  await ensureSchema(env.AUTH);
  await destroySession(request, env);
  return json({ authenticated: false }, 200, {
    "set-cookie": sessionCookie(request, null),
  });
};
