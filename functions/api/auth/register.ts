import {
  allow,
  ensureSchema,
  authenticated,
  consumeOtp,
  credentialCount,
  getState,
  json,
  listCredentials,
  putChallenge,
  relyingParty,
  saveCredential,
  setState,
  takeChallenge,
} from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import { totpMatches } from "../../lib/crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

const USER_ID = new TextEncoder().encode("junaadh-admin");

type Body = {
  step: "options" | "verify";
  password?: string;
  totp?: string;
  challengeId?: string;
  label?: string;
  response?: RegistrationResponseJSON;
};

/**
 * Registers a passkey. Authorised either by a live session (adding a second
 * device) or by a one-time password from bootstrap/recovery.
 *
 * The very first registration must also confirm a TOTP code, so the recovery
 * factor can never be left un-enrolled — that would recreate the lockout the
 * design exists to avoid.
 */
export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  await ensureSchema(env.AUTH);
  if (!(await allow(env, request, "register", 20, 3600)))
    return json({ error: "too many attempts" }, 429);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return json({ error: "expected JSON" }, 400);

  const party = relyingParty(request, env);
  const existing = await credentialCount(env);
  const session = await authenticated(request, env);

  if (body.step === "options") {
    if (!session) {
      if (!body.password || !(await consumeOtp(env, body.password, "bootstrap")))
        return json({ error: "invalid or expired password" }, 401);
    }
    const { results } = await listCredentials(env);
    const options = await generateRegistrationOptions({
      rpName: "junaadh.dev",
      rpID: party.id,
      userID: USER_ID,
      userName: "junaadh",
      userDisplayName: "Junad",
      attestationType: "none",
      // Never silently replace a working key with one on the same device.
      excludeCredentials: results.map((row) => ({ id: row.id })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });
    return json({
      challengeId: await putChallenge(env, options.challenge, "register"),
      options,
      // Signals to the panel that a TOTP code is required to finish.
      totpRequired: existing === 0,
    });
  }

  if (body.step !== "verify") return json({ error: "unknown step" }, 400);
  if (!body.challengeId || !body.response)
    return json({ error: "missing challenge or response" }, 400);

  const challenge = await takeChallenge(env, body.challengeId, "register");
  if (!challenge) return json({ error: "challenge expired" }, 400);

  if (existing === 0) {
    const secret = await getState(env, "totp_secret");
    if (!secret) return json({ error: "no TOTP secret enrolled" }, 409);
    if (!body.totp || !(await totpMatches(secret, body.totp)))
      return json({ error: "invalid TOTP code" }, 401);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: party.origin,
      expectedRPID: party.id,
      requireUserVerification: false,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
  if (!verification.verified || !verification.registrationInfo)
    return json({ error: "registration could not be verified" }, 400);

  const { credential } = verification.registrationInfo;
  await saveCredential(env, {
    id: credential.id,
    publicKey: btoa(String.fromCharCode(...credential.publicKey)),
    counter: credential.counter,
    transports: credential.transports,
    label: (body.label || "passkey").slice(0, 40),
  });

  // First key in: TOTP is confirmed working, so shut bootstrap.
  if (existing === 0) {
    await setState(env, "totp_enrolled", "yes");
    await setState(env, "bootstrap_armed", "no");
  }
  return json({ registered: true, credentials: existing + 1 });
};
