import {
  allow,
  ensureSchema,
  createSession,
  getCredential,
  json,
  listCredentials,
  putChallenge,
  relyingParty,
  sessionCookie,
  takeChallenge,
  touchCredential,
} from "../../lib/auth";
import type { AuthEnv } from "../../lib/auth";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

type Body = {
  step: "options" | "verify";
  challengeId?: string;
  response?: AuthenticationResponseJSON;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  await ensureSchema(env.AUTH);
  if (!(await allow(env, request, "login", 30, 900)))
    return json({ error: "too many attempts" }, 429);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return json({ error: "expected JSON" }, 400);
  const party = relyingParty(request, env);

  if (body.step === "options") {
    const { results } = await listCredentials(env);
    if (results.length === 0)
      return json({ error: "no passkey registered" }, 409);
    const options = await generateAuthenticationOptions({
      rpID: party.id,
      allowCredentials: results.map((row) => ({ id: row.id })),
      userVerification: "preferred",
    });
    return json({
      challengeId: await putChallenge(env, options.challenge, "login"),
      options,
    });
  }

  if (body.step !== "verify") return json({ error: "unknown step" }, 400);
  if (!body.challengeId || !body.response)
    return json({ error: "missing challenge or response" }, 400);

  const challenge = await takeChallenge(env, body.challengeId, "login");
  if (!challenge) return json({ error: "challenge expired" }, 400);

  const stored = await getCredential(env, body.response.id);
  if (!stored) return json({ error: "unknown credential" }, 401);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: party.origin,
      expectedRPID: party.id,
      credential: {
        id: stored.id,
        publicKey: Uint8Array.from(atob(stored.public_key), (c) =>
          c.charCodeAt(0),
        ),
        counter: stored.counter,
        transports: stored.transports
          ? JSON.parse(stored.transports)
          : undefined,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
  if (!verification.verified) return json({ error: "not verified" }, 401);

  // Rolls the signature counter forward, which is how cloned authenticators
  // are detected on the next use.
  await touchCredential(env, stored.id, verification.authenticationInfo.newCounter);

  const token = await createSession(env);
  return json({ authenticated: true }, 200, {
    "set-cookie": sessionCookie(request, token),
  });
};
