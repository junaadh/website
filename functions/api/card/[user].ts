// GET /api/card/<login>.svg   the rendered card
// GET /api/card/<login>.json  the data the card is drawn from (the playground renders locally)
//
//   ?preset=<id>        a built-in script (default: classic)
//   ?script=<id>        a saved script (POST /api/card/scripts), instead of a preset
//   ?s=<encoded>        a script carried in the URL (lib/card/share.ts), when not saved
//   ?<anything else>    handed to the script as card.param(name, fallback), up to 16
//
// Errors are never cached. Script diagnostics come back as a 200 SVG so they
// show up in a README; data errors keep their status (with an SVG body).

import { renderError } from "../../../lib/card/error";
import { renderScript } from "../../../lib/card/pipeline";
import { DEFAULT_PRESET, PRESETS, presetById } from "../../../lib/card/presets";
import { decodeScript, MAX_ENCODED } from "../../../lib/card/share";
import { ID, scriptKey } from "../../../lib/card/short";
import type { CardUser } from "../../../lib/card/types";
import { dataKey, getJson, getResponse, putJson, putResponse } from "../../lib/cache";
import { cardRuntime } from "../../lib/card-runtime";
import { type Fetched, fetchCardUser, GitHubError } from "../../lib/github";

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const PARAM_KEY = /^[A-Za-z0-9_.-]{1,32}$/;
const MAX_PARAMS = 16;
const MAX_VALUE = 100;

const HOUR = 3600;
const DAY = 86_400;

const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
  "x-content-type-options": "nosniff",
};
const NO_STORE = { "cache-control": "no-store" };

type Kind = "svg" | "json";

function fail(kind: Kind, status: number, message: string): Response {
  if (kind === "json") {
    return Response.json({ error: message }, { status, headers: NO_STORE });
  }
  return new Response(renderError(message, "eitri // card api"), {
    status,
    headers: { ...SVG_HEADERS, ...NO_STORE },
  });
}

/** GitHub data for a login, from the cache (1 h) or GitHub. */
async function userData(login: string, env: Env): Promise<Fetched> {
  const key = dataKey("github", login.toLowerCase());
  const hit = await getJson<Fetched>(key);
  if (hit && hit.age < HOUR * 1000) return hit.value;
  const fresh = await fetchCardUser(login, env.GITHUB_TOKEN || undefined);
  await putJson(key, fresh, HOUR);
  return fresh;
}

interface Request_ {
  script: string;
  params: Record<string, string>;
}

/** Script and params from the query string, or a message saying what is wrong. */
async function parseQuery(url: URL, env: Env): Promise<Request_ | string> {
  const params: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of url.searchParams) {
    if (k === "s" || k === "script" || k === "preset" || k in params) continue;
    if (++count > MAX_PARAMS)
      return `at most ${MAX_PARAMS} parameters besides script, s and preset`;
    if (!PARAM_KEY.test(k)) return `parameter name "${k.slice(0, 20)}" is not allowed`;
    if (v.length > MAX_VALUE) return `parameter "${k}" is longer than ${MAX_VALUE} characters`;
    params[k] = v;
  }
  const saved = url.searchParams.get("script");
  if (saved !== null) {
    if (!ID.test(saved)) return "that is not a script id";
    const script = env.CARDS ? await env.CARDS.get(scriptKey(saved)) : null;
    return script === null ? `no saved script "${saved}"` : { script, params };
  }
  const shared = url.searchParams.get("s");
  if (shared !== null) {
    if (shared.length > MAX_ENCODED) return "the shared script is too long";
    const script = await decodeScript(shared);
    return script === null ? "the shared script could not be decoded" : { script, params };
  }
  const id = url.searchParams.get("preset") ?? DEFAULT_PRESET;
  const preset = presetById(id);
  if (!preset) {
    return `no preset "${id.slice(0, 30)}". Presets: ${PRESETS.map((p) => p.id).join(", ")}`;
  }
  return { script: preset.source, params };
}

/** The same card has the same key whatever order its parameters came in. */
function svgKey(url: URL, login: string): Request {
  const sorted = [...url.searchParams].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const query = new URLSearchParams(sorted).toString();
  return new Request(`${url.origin}/api/card/${login.toLowerCase()}.svg?${query}`);
}

async function draw(login: string, query: Request_, env: Env) {
  const { user, source } = await userData(login, env);
  const runtime = await cardRuntime();
  const { svg, ok } = renderScript(runtime, query.script, user, query.params);
  return { svg, ok, source };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  const match = /^(.+?)(?:\.(svg|json))?$/.exec(String(params.user ?? ""));
  const kind: Kind = match?.[2] === "json" ? "json" : "svg";
  const login = match?.[1] ?? "";
  if (!LOGIN.test(login)) return fail(kind, 400, "That is not a valid GitHub username.");

  try {
    if (kind === "json") {
      const { user, source } = await userData(login, env);
      return Response.json(user satisfies CardUser, {
        headers: { "cache-control": `public, max-age=${HOUR}`, "x-card-source": source },
      });
    }

    const url = new URL(request.url);
    const query = await parseQuery(url, env);
    if (typeof query === "string") return fail("svg", 400, query);

    const key = svgKey(url, login);
    const cached = await getResponse(key);
    const refresh = async () => {
      const { svg, ok, source } = await draw(login, query, env);
      if (ok) await putResponse(key, svg, okHeaders(source), DAY);
    };
    if (cached) {
      // Stale-while-revalidate: past an hour, serve it and redraw in the background.
      if (cached.age >= HOUR * 1000) waitUntil(refresh().catch(() => {}));
      return new Response(cached.value.body, {
        headers: okHeaders(cached.value.headers.get("x-card-source") ?? "rest"),
      });
    }

    const { svg, ok, source } = await draw(login, query, env);
    if (!ok) return new Response(svg, { headers: { ...SVG_HEADERS, ...NO_STORE } });
    waitUntil(putResponse(key, svg, okHeaders(source), DAY));
    return new Response(svg, { headers: okHeaders(source) });
  } catch (error) {
    if (error instanceof GitHubError) return fail(kind, error.status, error.message);
    return fail(kind, 500, "The card could not be rendered.");
  }
};

function okHeaders(source: string): Record<string, string> {
  return {
    ...SVG_HEADERS,
    "cache-control": `public, max-age=${HOUR}, stale-while-revalidate=${DAY}`,
    "x-card-source": source,
    ...(source === "rest"
      ? { "x-card-note": "no GITHUB_TOKEN: REST fallback, contributions and heatmap are empty" }
      : {}),
  };
}
