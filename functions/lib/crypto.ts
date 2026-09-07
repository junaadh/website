/** Web Crypto only — no Node builtins, so this runs unchanged in a Worker. */

const encoder = new TextEncoder();

export const toBase64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const random = (bytes = 32) =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256(value: string) {
  return toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Constant-time compare, so a mismatch leaks nothing through timing. */
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret: Uint8Array, data: Uint8Array, hash: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret as BufferSource,
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, data as BufferSource),
  );
}

/* ------------------------------------------------------------------- JWT -- */

type Claims = { jti?: string; exp?: number; iat?: number; sub?: string };

/**
 * Verifies a compact HS256 JWT. Deliberately strict: `exp` and `jti` are
 * required, because the bootstrap route relies on both to be single-use.
 */
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<Claims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts;

  let header: { alg?: string; typ?: string };
  let claims: Claims;
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64Url(head)));
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  } catch {
    return null;
  }
  // Pin the algorithm: never let the token choose, and never accept "none".
  if (header.alg !== "HS256") return null;

  const expected = toBase64Url(
    await hmac(encoder.encode(secret), encoder.encode(`${head}.${body}`), "SHA-256"),
  );
  if (!equal(expected, signature)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= now) return null;
  // Refuse absurdly long-lived tokens even if correctly signed.
  if (claims.exp - now > 3600) return null;
  if (typeof claims.jti !== "string" || claims.jti.length < 8) return null;
  return claims;
}

/* ------------------------------------------------------------------ TOTP -- */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(value: string) {
  const clean = value.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let buffer = 0;
  for (const character of clean) {
    const index = BASE32.indexOf(character);
    if (index === -1) throw new Error("invalid base32");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/** RFC 6238, SHA-1, 6 digits, 30s step — what every authenticator app expects. */
export async function totp(secret: string, step: number) {
  const counter = new Uint8Array(8);
  let value = step;
  for (let i = 7; i >= 0; i--) {
    counter[i] = value & 255;
    value = Math.floor(value / 256);
  }
  const digest = await hmac(base32Decode(secret), counter, "SHA-1");
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, "0");
}

/** Accepts the neighbouring windows so a slightly skewed clock still works. */
export async function totpMatches(secret: string, code: string, drift = 1) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (let offset = -drift; offset <= drift; offset++)
    if (equal(await totp(secret, now + offset), clean)) return true;
  return false;
}
