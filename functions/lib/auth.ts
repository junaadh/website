import type { Env as ConfigEnv } from "./store";
import { equal, random, sha256 } from "./crypto";
import { ensureSchema } from "./schema";

export type AuthEnv = ConfigEnv & {
  AUTH: D1Database;
  BOOTSTRAP_JWT_SECRET: string;
  /** Optional overrides; otherwise taken from the request's own origin. */
  RP_ID?: string;
  RP_ORIGIN?: string;
};

const SESSION_TTL = 60 * 60 * 8;
const COOKIE = "admin_session";
const now = () => Math.floor(Date.now() / 1000);

/* ------------------------------------------------------------ relying party --
   Pages serves one bound hostname, so the request origin is trustworthy here;
   the env overrides exist for preview deployments and custom domains. */
export function relyingParty(request: Request, env: AuthEnv) {
  const url = new URL(request.url);
  return {
    id: env.RP_ID || url.hostname,
    origin: env.RP_ORIGIN || url.origin,
  };
}

/* ----------------------------------------------------------------- state -- */

export async function getState(env: AuthEnv, key: string) {
  const row = await env.AUTH.prepare("SELECT value FROM state WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function setState(env: AuthEnv, key: string, value: string) {
  await env.AUTH.prepare(
    "INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
    .bind(key, value)
    .run();
}

/* ----------------------------------------------------------- credentials -- */

export type StoredCredential = {
  id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  label: string | null;
  created_at: number;
  last_used: number | null;
};

export async function credentialCount(env: AuthEnv) {
  const row = await env.AUTH.prepare(
    "SELECT COUNT(*) AS n FROM credentials",
  ).first<{ n: number }>();
  return row?.n ?? 0;
}

export const listCredentials = (env: AuthEnv) =>
  env.AUTH.prepare(
    "SELECT id, label, created_at, last_used FROM credentials ORDER BY created_at",
  ).all<Omit<StoredCredential, "public_key" | "counter" | "transports">>();

export const getCredential = (env: AuthEnv, id: string) =>
  env.AUTH.prepare("SELECT * FROM credentials WHERE id = ?")
    .bind(id)
    .first<StoredCredential>();

export async function saveCredential(
  env: AuthEnv,
  credential: {
    id: string;
    publicKey: string;
    counter: number;
    transports?: string[];
    label: string;
  },
) {
  await env.AUTH.prepare(
    "INSERT INTO credentials (id, public_key, counter, transports, label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      credential.id,
      credential.publicKey,
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null,
      credential.label,
      now(),
    )
    .run();
}

export async function touchCredential(
  env: AuthEnv,
  id: string,
  counter: number,
) {
  await env.AUTH.prepare(
    "UPDATE credentials SET counter = ?, last_used = ? WHERE id = ?",
  )
    .bind(counter, now(), id)
    .run();
}

/* ------------------------------------------------------------ challenges -- */

export async function putChallenge(
  env: AuthEnv,
  challenge: string,
  purpose: "register" | "login",
) {
  const id = random(16);
  await env.AUTH.prepare(
    "INSERT INTO challenges (id, challenge, purpose, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, challenge, purpose, now() + 300)
    .run();
  return id;
}

/** Single use: the row is deleted whether or not it had expired. */
export async function takeChallenge(
  env: AuthEnv,
  id: string,
  purpose: "register" | "login",
) {
  const row = await env.AUTH.prepare(
    "SELECT challenge, expires_at FROM challenges WHERE id = ? AND purpose = ?",
  )
    .bind(id, purpose)
    .first<{ challenge: string; expires_at: number }>();
  await env.AUTH.prepare("DELETE FROM challenges WHERE id = ?").bind(id).run();
  if (!row || row.expires_at < now()) return null;
  return row.challenge;
}

/* ------------------------------------------------------------------ OTPs -- */

/** Returns the plaintext once; only its hash is stored. */
export async function issueOtp(
  env: AuthEnv,
  purpose: "bootstrap" | "recover",
  ttlSeconds: number,
) {
  const password = random(18);
  await env.AUTH.prepare(
    "INSERT INTO otps (id, purpose, expires_at) VALUES (?, ?, ?)",
  )
    .bind(await sha256(password), purpose, now() + ttlSeconds)
    .run();
  return { password, expiresAt: now() + ttlSeconds };
}

export async function consumeOtp(
  env: AuthEnv,
  password: string,
  purpose: "bootstrap" | "recover",
) {
  const id = await sha256(password);
  const row = await env.AUTH.prepare(
    "SELECT expires_at FROM otps WHERE id = ? AND purpose = ?",
  )
    .bind(id, purpose)
    .first<{ expires_at: number }>();
  await env.AUTH.prepare("DELETE FROM otps WHERE id = ?").bind(id).run();
  return !!row && row.expires_at >= now();
}

/* -------------------------------------------------------------- sessions -- */

export async function createSession(env: AuthEnv) {
  const token = random(32);
  await env.AUTH.prepare(
    "INSERT INTO sessions (id, created_at, expires_at) VALUES (?, ?, ?)",
  )
    .bind(await sha256(token), now(), now() + SESSION_TTL)
    .run();
  return token;
}

const readCookie = (request: Request, name: string) =>
  (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1] ?? null;

/** True when the request carries a live session. */
export async function authenticated(request: Request, env: AuthEnv) {
  const token = readCookie(request, COOKIE);
  if (!token) return false;
  const row = await env.AUTH.prepare(
    "SELECT expires_at FROM sessions WHERE id = ?",
  )
    .bind(await sha256(token))
    .first<{ expires_at: number }>();
  return !!row && row.expires_at >= now();
}

export async function destroySession(request: Request, env: AuthEnv) {
  const token = readCookie(request, COOKIE);
  if (token)
    await env.AUTH.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(await sha256(token))
      .run();
}

export function sessionCookie(request: Request, token: string | null) {
  // The __Host- prefix would be stronger but requires HTTPS, which local
  // `wrangler pages dev` is not; Secure is applied whenever the scheme allows.
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return token === null
    ? `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
    : `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}${secure}`;
}

/* ---------------------------------------------------------- rate limiting -- */

/** Fixed window per route+IP. Returns false once the budget is spent. */
export async function allow(
  env: AuthEnv,
  request: Request,
  route: string,
  max: number,
  windowSeconds: number,
) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const bucket = `${route}:${ip}`;
  const row = await env.AUTH.prepare(
    "SELECT count, reset_at FROM attempts WHERE bucket = ?",
  )
    .bind(bucket)
    .first<{ count: number; reset_at: number }>();
  if (!row || row.reset_at < now()) {
    await env.AUTH.prepare(
      "INSERT INTO attempts (bucket, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = 1, reset_at = excluded.reset_at",
    )
      .bind(bucket, now() + windowSeconds)
      .run();
    return true;
  }
  if (row.count >= max) return false;
  await env.AUTH.prepare(
    "UPDATE attempts SET count = count + 1 WHERE bucket = ?",
  )
    .bind(bucket)
    .run();
  return true;
}

/* ------------------------------------------------------------- bootstrap -- */

/**
 * Bootstrap is open only until the first passkey exists. After that it stays
 * shut unless deliberately re-armed out of band (`bootstrap_armed = 'yes'` via
 * wrangler or the dashboard), which is the documented break-glass path.
 */
export async function bootstrapOpen(env: AuthEnv) {
  if ((await getState(env, "bootstrap_armed")) === "yes") return true;
  return (await credentialCount(env)) === 0;
}

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, { status, headers });

/** Marks a bootstrap JWT id as spent so the same token cannot be reused. */
export async function claimToken(env: AuthEnv, jti: string, exp: number) {
  try {
    await env.AUTH.prepare(
      "INSERT INTO used_tokens (jti, expires_at) VALUES (?, ?)",
    )
      .bind(jti, exp)
      .run();
    return true;
  } catch {
    // Primary-key conflict: already used.
    return false;
  }
}

export { equal, ensureSchema };
