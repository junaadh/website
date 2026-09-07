import { allow, ensureSchema, getState, issueOtp, json } from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import { totpMatches } from "../../lib/crypto";

/**
 * The way back in when the passkey is gone. A valid TOTP code mints a
 * short-lived password, which `register` accepts in place of a session so a
 * replacement passkey can be enrolled.
 *
 * Rate limited hard: this is the only route where a six-digit secret is the
 * whole barrier, so brute force is the realistic threat.
 */
export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  await ensureSchema(env.AUTH);
  if (!(await allow(env, request, "recover", 5, 900)))
    return json({ error: "too many attempts" }, 429);

  const body = (await request.json().catch(() => null)) as {
    totp?: string;
  } | null;
  if (!body?.totp) return json({ error: "expected { totp }" }, 400);

  const secret = await getState(env, "totp_secret");
  if (!secret || (await getState(env, "totp_enrolled")) !== "yes")
    return json({ error: "recovery is not available" }, 409);

  if (!(await totpMatches(secret, body.totp)))
    return json({ error: "invalid code" }, 401);

  const { password, expiresAt } = await issueOtp(env, "bootstrap", 600);
  return json({
    password,
    expiresAt,
    next: "POST /api/auth/register/options with { password }",
  });
};
