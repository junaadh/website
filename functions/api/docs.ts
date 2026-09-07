import { authenticated, ensureSchema } from "../lib/auth";
import type { AuthEnv } from "../lib/auth";

/**
 * Interactive reference for the spec at /api/openapi.json.
 *
 * This is the one page on the site that loads a third-party script. It is
 * behind a session and only ever seen by one person, so pulling a ~1 MB viewer
 * from a CDN is cheaper than bundling it into either entry point. The public
 * site keeps its no-third-party-requests property.
 */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Sign in</title>
<body style="font:15px system-ui;background:#171916;color:#e7e9e1;display:grid;place-items:center;height:100svh;margin:0">
<p>Sign in at <a href="/admin" style="color:#c5f66a">/admin</a> to read the API docs.</p>`,
      { status: 401, headers: { "content-type": "text/html; charset=utf-8" } },
    );

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>API — junaadh.dev</title>
</head>
<body>
<script id="api-reference" data-url="/api/openapi.json"></script>
<script>
  var configuration = { theme: "kepler", darkMode: true, hideDownloadButton: false };
  document.getElementById("api-reference").dataset.configuration =
    JSON.stringify(configuration);
</script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
};
