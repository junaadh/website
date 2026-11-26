// POST /api/card/scripts   body: the script text   ->   { "id": "Kx9fQ2mZ7aB" }
//
// Saves a card script so an embed can say ?script=<id> instead of carrying the
// whole script in the URL. Ids are content addressed (SHA-256 of the script),
// so saving the same script twice gives the same id and a saved script can
// never be changed under someone's README. Scripts that do not compile are
// refused, so nothing unusable is stored.
//
// Needs a KV namespace bound as CARDS. Without it this answers 501 and the
// studio falls back to a long ?s= link.

import { renderScript } from "../../../lib/card/pipeline";
import { SAMPLE_USER } from "../../../lib/card/sample";
import { MAX_STORED, scriptId, scriptKey } from "../../../lib/card/short";
import { cardRuntime } from "../../lib/card-runtime";

const NO_STORE = { "cache-control": "no-store" };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_STORED) return tooLong();
  const script = await request.text();
  if (script.length === 0) {
    return Response.json({ error: "the script is empty" }, { status: 400, headers: NO_STORE });
  }
  if (new TextEncoder().encode(script).length > MAX_STORED) return tooLong();

  // Only store what compiles: render once against the sample profile.
  const runtime = await cardRuntime();
  const { result } = renderScript(runtime, script, SAMPLE_USER, {});
  if (result.outcome === "compile") {
    return Response.json(
      { error: "the script does not compile", report: result.report },
      { status: 422, headers: NO_STORE },
    );
  }

  const id = await scriptId(script);
  const key = scriptKey(id);
  if ((await env.CARDS.get(key)) === null) await env.CARDS.put(key, script);
  return Response.json({ id }, { headers: NO_STORE });
};

function tooLong(): Response {
  return Response.json(
    { error: `scripts are limited to ${MAX_STORED / 1024} KB` },
    { status: 413, headers: NO_STORE },
  );
}
