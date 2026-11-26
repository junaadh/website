// Workers Cache API helpers. Errors are never stored: only callers that hold a
// good value call put().

const cache = () => (caches as unknown as { default: Cache }).default;

/** A synthetic, never-fetched key for data that has no URL of its own. */
export const dataKey = (kind: string, id: string) =>
  new Request(`https://cache.invalid/${kind}/${encodeURIComponent(id)}`);

export interface Stored<T> {
  value: T;
  /** Milliseconds since it was stored. */
  age: number;
}

export async function getJson<T>(key: Request): Promise<Stored<T> | null> {
  const hit = await cache().match(key);
  if (!hit) return null;
  const at = Number(hit.headers.get("x-stored-at"));
  return { value: (await hit.json()) as T, age: Number.isFinite(at) ? Date.now() - at : Infinity };
}

export function putJson(key: Request, value: unknown, ttlSeconds: number): Promise<void> {
  return cache().put(
    key,
    new Response(JSON.stringify(value), {
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${ttlSeconds}`,
        "x-stored-at": String(Date.now()),
      },
    }),
  );
}

export async function getResponse(key: Request): Promise<Stored<Response> | null> {
  const hit = await cache().match(key);
  if (!hit) return null;
  const at = Number(hit.headers.get("x-stored-at"));
  return { value: hit, age: Number.isFinite(at) ? Date.now() - at : Infinity };
}

export function putResponse(key: Request, body: string, headers: HeadersInit, ttlSeconds: number) {
  const h = new Headers(headers);
  h.set("cache-control", `public, max-age=${ttlSeconds}`);
  h.set("x-stored-at", String(Date.now()));
  return cache().put(key, new Response(body, { headers: h }));
}
