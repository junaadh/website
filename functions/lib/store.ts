import { validate, type SiteConfig } from "../../shared/config";

export type Env = {
  CONFIG: KVNamespace;
};

/* Version-keyed immutable entries behind a short-lived pointer.
   `config:version` holds a number; `config:v<N>` holds that version's blob and
   is never rewritten. Publishing writes the blob first and bumps the pointer
   last, so a half-finished publish is never observable. */
const POINTER = "config:version";
const blobKey = (version: number) => `config:v${version}`;

/** How long a PoP may serve a stale pointer. Bounds publish propagation. */
const POINTER_TTL = 60;

/* Warm isolates answer from here without touching KV at all. Keyed by version,
   so a bumped pointer naturally misses and refetches. */
let memo: { version: number; config: SiteConfig } | null = null;

async function readPointer(env: Env): Promise<number | null> {
  const raw = await env.CONFIG.get(POINTER, { cacheTtl: POINTER_TTL });
  const version = raw === null ? NaN : Number(raw);
  return Number.isInteger(version) && version > 0 ? version : null;
}

export type Published = { version: number; config: SiteConfig };

/**
 * The published config, or null when nothing has been published yet — in which
 * case every caller must fall back to the data baked in at build time. This is
 * the property that lets the Functions ship as a no-op.
 *
 * The version comes back with it so callers can key their own caches on it.
 */
export async function readConfig(env: Env): Promise<Published | null> {
  // Before the KV namespace is bound at all, every request is a pass-through.
  if (!env?.CONFIG) return null;
  let version: number | null = null;
  try {
    version = await readPointer(env);
  } catch {
    // Storage trouble must never take the site down; serve the built-in data.
    return memo;
  }
  if (version === null) return null;
  if (memo?.version === version) return memo;

  try {
    // Immutable once written, so it can be cached hard at the edge.
    const raw = await env.CONFIG.get(blobKey(version), {
      type: "json",
      cacheTtl: 86400,
    });
    if (raw === null) return memo;
    const result = validate(raw);
    // A blob that no longer matches the schema is treated as absent rather than
    // rendered: the build-time fallback is always a valid page.
    if (!result.ok) return memo;
    memo = { version, config: result.config };
    return memo;
  } catch {
    return memo;
  }
}

/** Returns the version written. Callers must have validated `config` already. */
export async function writeConfig(
  env: Env,
  config: SiteConfig,
): Promise<number> {
  const current = (await readPointer(env)) ?? 0;
  const next = current + 1;
  await env.CONFIG.put(blobKey(next), JSON.stringify(config));
  // Pointer last: until this lands, readers keep serving `current` cleanly.
  await env.CONFIG.put(POINTER, String(next));
  memo = { version: next, config };
  return next;
}

/** Steps the pointer back one version, for the panel's revert action. */
export async function revertConfig(env: Env): Promise<number | null> {
  const current = await readPointer(env);
  if (current === null || current <= 1) return null;
  const previous = current - 1;
  if ((await env.CONFIG.get(blobKey(previous))) === null) return null;
  await env.CONFIG.put(POINTER, String(previous));
  memo = null;
  return previous;
}
