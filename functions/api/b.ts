import type { Env } from "../lib/store";

/* Public write, so it is deliberately narrow: 24 characters (the same cap as
   the hero input), 20 creations per hour per IP, and a 90-day TTL. */
const MAX = 24;
const TTL = 60 * 60 * 24 * 90;

const id = () =>
  [...crypto.getRandomValues(new Uint8Array(6))]
    .map((byte) => "abcdefghijkmnpqrstuvwxyz23456789"[byte % 32])
    .join("");

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CONFIG) return Response.json({ error: "unavailable" }, { status: 503 });

  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const bucket = `b:rate:${ip}`;
  const used = Number((await env.CONFIG.get(bucket)) ?? "0");
  if (used >= 20)
    return Response.json({ error: "too many links" }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { value?: string } | null;
  const value = typeof body?.value === "string" ? body.value.slice(0, MAX) : "";
  if (!value) return Response.json({ error: "expected { value }" }, { status: 400 });

  const key = id();
  await env.CONFIG.put(`b:${key}`, value, { expirationTtl: TTL });
  await env.CONFIG.put(bucket, String(used + 1), { expirationTtl: 3600 });
  return Response.json({ id: key, url: `/b/${key}` });
};
