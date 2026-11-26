// POST /api/card/scripts   body: the script text   ->   { "id": "Kx9fQ2mZ7aB" }
//
// Saves a card script so an embed can say ?script=<id> instead of carrying the
// whole script in the URL. Ids are content addressed (SHA-256 of the script),
// so saving the same script twice gives the same id and a saved script can
// never be changed under someone's README. Scripts that do not compile are
// refused unless a test render finishes cleanly, so nothing unusable is stored.
//
// Writes must come from this site (the Origin header has to match). Scripts
// are stored permanently on purpose: short links live in READMEs and must not
// expire. Rate limiting is done at the edge (a Cloudflare rate limiting rule
// on POST /api/card/scripts), not here.
//
// Needs a KV namespace bound as CARDS. Without it this answers 501 and the
// studio falls back to a long ?s= link.

import { renderScript } from "../../../lib/card/pipeline";
import { SAMPLE_USER } from "../../../lib/card/sample";
import { MAX_STORED, scriptId, scriptKey } from "../../../lib/card/short";
import { cardRuntime } from "../../lib/card-runtime";

const NO_STORE = { "cache-control": "no-store" };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Same origin only: a cross-site page cannot fill the store through a visitor's browser.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json(
      { error: "cross-origin requests are refused" },
      { status: 403, headers: NO_STORE },
    );
  }
  if (!env.CARDS) {
    return Response.json(
      { error: "short links are not configured" },
      { status: 501, headers: NO_STORE },
    );
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("text/plain")) {
    return Response.json(
      { error: "send the script as text/plain" },
      { status: 415, headers: NO_STORE },
    );
  }
  const body = await readCapped(request, MAX_STORED);
  if (body === null) return tooLong();
  if (body.length === 0) {
    return Response.json({ error: "the script is empty" }, { status: 400, headers: NO_STORE });
  }
  let script: string;
  try {
    script = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body);
  } catch {
    return Response.json(
      { error: "the script is not valid UTF-8" },
      { status: 400, headers: NO_STORE },
    );
  }

  // Only store what runs: render once against the sample profile; it must finish cleanly.
  const runtime = await cardRuntime();
  const { result } = renderScript(runtime, script, SAMPLE_USER, {});
  if (result.outcome !== "ok") {
    return Response.json(
      {
        error:
          result.outcome === "compile"
            ? "the script does not compile"
            : "the script faults when it runs",
        report: result.report,
      },
      { status: 422, headers: NO_STORE },
    );
  }

  const id = await scriptId(script);
  const key = scriptKey(id);
  if ((await env.CARDS.get(key)) === null) await env.CARDS.put(key, script);
  return Response.json({ id }, { headers: NO_STORE });
};

/** The body, read as a stream and abandoned past max bytes; null when it is too long. Content-Length is not trusted. */
async function readCapped(request: Request, max: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

function tooLong(): Response {
  return Response.json(
    { error: `scripts are limited to ${MAX_STORED / 1024} KB` },
    { status: 413, headers: NO_STORE },
  );
}
