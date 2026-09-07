import {
  allow,
  ensureSchema,
  bootstrapOpen,
  claimToken,
  getState,
  issueOtp,
  json,
  setState,
} from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import { base32Encode, verifyJwt } from "../../lib/crypto";

const OTP_TTL = 600;

/**
 * The one-time way in. Present a JWT signed with BOOTSTRAP_JWT_SECRET and get
 * back a password valid for ten minutes, plus the TOTP secret to enrol as the
 * recovery factor. Once a passkey is registered this route answers 403 forever,
 * unless `bootstrap_armed` is set out of band.
 *
 *   curl -X POST https://junaadh.dev/api/auth/bootstrap \
 *        -H "authorization: Bearer <jwt>"
 */
export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  await ensureSchema(env.AUTH);

  if (!(await allow(env, request, "bootstrap", 10, 3600)))
    return json({ error: "too many attempts" }, 429);

  if (!env.BOOTSTRAP_JWT_SECRET)
    return json({ error: "bootstrap is not configured" }, 503);

  // Closed-by-default: check before doing any token work.
  if (!(await bootstrapOpen(env)))
    return json({ error: "bootstrap is closed" }, 403);

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return json({ error: "missing bearer token" }, 401);

  const claims = await verifyJwt(token, env.BOOTSTRAP_JWT_SECRET);
  if (!claims) return json({ error: "invalid token" }, 401);
  if (!(await claimToken(env, claims.jti!, claims.exp!)))
    return json({ error: "token already used" }, 401);

  const { password, expiresAt } = await issueOtp(env, "bootstrap", OTP_TTL);

  /* The TOTP secret is generated once and returned only while bootstrap is
     open, so it cannot be re-read after enrolment. */
  let secret = await getState(env, "totp_secret");
  if (!secret) {
    secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
    await setState(env, "totp_secret", secret);
  }

  const label = encodeURIComponent("junaadh.dev admin");
  return json({
    password,
    expiresAt,
    expiresIn: OTP_TTL,
    totp: {
      secret,
      uri: `otpauth://totp/${label}?secret=${secret}&issuer=junaadh.dev&digits=6&period=30`,
    },
    next: "POST /api/auth/register/options with { password } within 10 minutes",
  });
};
