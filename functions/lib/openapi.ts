/**
 * The API description, hand-written rather than generated: the routes are few
 * and Pages Functions carry no decorators to introspect, so a generator would
 * be more machinery than the thing it describes.
 *
 * Served from /api/openapi.json behind a session, and rendered at /api/docs.
 */

const json = (schema: unknown) => ({ "application/json": { schema } });

const errorResponse = {
  description: "Failed",
  content: json({
    type: "object",
    properties: { error: { type: "string" } },
    required: ["error"],
  }),
};

const sessionOnly = [{ sessionCookie: [] }];

/* Named once so the shapes stay in step with shared/config.ts. */
const schemas = {
  Flags: {
    type: "object",
    properties: {
      marquee: { type: "boolean" },
      sectionNav: { type: "boolean" },
      commandPalette: { type: "boolean" },
      byteInspector: { type: "boolean" },
    },
    required: ["marquee", "sectionNav", "commandPalette", "byteInspector"],
  },
  Theme: {
    type: "object",
    description: "16 hex colour tokens; see tokenNames in shared/config.ts.",
    additionalProperties: { type: "string", pattern: "^#[0-9a-fA-F]{3,8}$" },
  },
  Palette: {
    type: "object",
    properties: { dark: { $ref: "#/components/schemas/Theme" }, light: { $ref: "#/components/schemas/Theme" } },
    required: ["dark", "light"],
  },
  Profile: {
    type: "object",
    description:
      "Site content. Validated on write; see validate() in shared/config.ts.",
    properties: {
      name: { type: "string" },
      handle: { type: "string" },
      title: { type: "string" },
      location: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      website: { type: "string", format: "uri" },
      github: {
        type: "string",
        description: "Must be a bare profile URL: https://github.com/<user>",
        pattern: "^https://github\\.com/[A-Za-z0-9-]+$",
      },
      summary: { type: "string" },
      about: { type: "string" },
      commonName: { type: "string" },
      fullName: { type: "string" },
      languages: { type: "array", items: { type: "string" } },
      stack: { type: "array", items: { type: "string" } },
      experience: { type: "array", items: { type: "object" } },
      projects: { type: "array", items: { type: "object" } },
      skills: { type: "array", items: { type: "object" } },
      education: { type: "array", items: { type: "object" } },
      social: { type: "object" },
    },
  },
  SiteConfig: {
    type: "object",
    properties: {
      profile: { $ref: "#/components/schemas/Profile" },
      palette: { $ref: "#/components/schemas/Palette" },
      flags: { $ref: "#/components/schemas/Flags" },
    },
    required: ["profile", "palette", "flags"],
  },
};

export function openapi(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "junaadh.dev",
      version: "1.0.0",
      description:
        "Edge API behind the portfolio. Content is published to KV as version-keyed " +
        "immutable blobs behind a pointer, and rendered into the HTML at the edge. " +
        "Authentication is a passkey; TOTP exists only for recovery.",
    },
    servers: [{ url: origin }],
    tags: [
      { name: "auth", description: "Passkey sign-in, bootstrap and recovery." },
      { name: "content", description: "Published site configuration." },
      { name: "jobs", description: "Work that cannot happen at the edge." },
      { name: "public", description: "No credentials required." },
    ],
    components: {
      schemas,
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "admin_session",
          description:
            "Set by POST /api/auth/login. HttpOnly, SameSite=Strict, 8h. " +
            "Stored server-side as a hash, so it can be revoked.",
        },
        bootstrapJwt: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "HS256, signed with BOOTSTRAP_JWT_SECRET. Requires jti and exp; " +
            "single use, and refused if exp is more than an hour out.",
        },
      },
    },
    paths: {
      "/api/auth/bootstrap": {
        post: {
          tags: ["auth"],
          summary: "Exchange a signed JWT for a one-time password",
          description:
            "Open only until the first passkey exists, then 403 forever unless " +
            "`bootstrap_armed` is set to `yes` in D1. Also returns the TOTP secret, " +
            "which is never readable again afterwards. 10/hour per IP.",
          security: [{ bootstrapJwt: [] }],
          responses: {
            200: {
              description: "Password and TOTP enrolment details",
              content: json({
                type: "object",
                properties: {
                  password: { type: "string" },
                  expiresIn: { type: "integer", example: 600 },
                  totp: {
                    type: "object",
                    properties: { secret: { type: "string" }, uri: { type: "string" } },
                  },
                },
              }),
            },
            401: errorResponse,
            403: { ...errorResponse, description: "Bootstrap is closed" },
            429: errorResponse,
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["auth"],
          summary: "Register a passkey",
          description:
            "Two steps. `options` needs a bootstrap/recovery password, or a live " +
            "session when adding a second device. `verify` completes it — and for " +
            "the very first credential a TOTP code is mandatory, so the recovery " +
            "factor can never be left un-enrolled.",
          requestBody: {
            required: true,
            content: json({
              type: "object",
              properties: {
                step: { type: "string", enum: ["options", "verify"] },
                password: { type: "string" },
                totp: { type: "string", pattern: "^\\d{6}$" },
                challengeId: { type: "string" },
                label: { type: "string" },
                response: { type: "object", description: "WebAuthn attestation" },
              },
              required: ["step"],
            }),
          },
          responses: { 200: { description: "Options, or confirmation" }, 401: errorResponse },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["auth"],
          summary: "Sign in with a passkey",
          description: "Two steps, `options` then `verify`. Sets the session cookie.",
          requestBody: {
            required: true,
            content: json({
              type: "object",
              properties: {
                step: { type: "string", enum: ["options", "verify"] },
                challengeId: { type: "string" },
                response: { type: "object", description: "WebAuthn assertion" },
              },
              required: ["step"],
            }),
          },
          responses: { 200: { description: "Signed in" }, 401: errorResponse },
        },
      },
      "/api/auth/recover": {
        post: {
          tags: ["auth"],
          summary: "Trade a TOTP code for a registration password",
          description:
            "The only way back in when the passkey is gone. 5 attempts per 15 " +
            "minutes, because six digits is the whole barrier here.",
          requestBody: {
            required: true,
            content: json({
              type: "object",
              properties: { totp: { type: "string", pattern: "^\\d{6}$" } },
              required: ["totp"],
            }),
          },
          responses: { 200: { description: "Password issued" }, 401: errorResponse, 429: errorResponse },
        },
      },
      "/api/auth/session": {
        get: {
          tags: ["auth"],
          summary: "Current session and enrolment state",
          responses: {
            200: {
              description: "State",
              content: json({
                type: "object",
                properties: {
                  authenticated: { type: "boolean" },
                  registered: { type: "integer" },
                  totpEnrolled: { type: "boolean" },
                  bootstrapOpen: { type: "boolean" },
                },
              }),
            },
          },
        },
        delete: { tags: ["auth"], summary: "Sign out", responses: { 200: { description: "Cleared" } } },
      },
      "/api/config": {
        get: {
          tags: ["content", "public"],
          summary: "The published configuration",
          description:
            "Public: it is exactly what the page already renders. Seeds from the " +
            "committed JSON when nothing is published. `no-store`, because the CV " +
            "build reads this to decide what to render.",
          responses: {
            200: {
              description: "Config",
              content: json({
                type: "object",
                properties: {
                  version: { type: "integer" },
                  published: { type: "boolean" },
                  config: { $ref: "#/components/schemas/SiteConfig" },
                },
              }),
            },
          },
        },
        put: {
          tags: ["content"],
          summary: "Publish a new version",
          description:
            "Writes `config:v<N+1>` then bumps the pointer, so a half-finished " +
            "publish is never observable. Live within the pointer TTL (60s).",
          security: sessionOnly,
          requestBody: { required: true, content: json({ $ref: "#/components/schemas/SiteConfig" }) },
          responses: {
            200: { description: "Published" },
            401: errorResponse,
            422: {
              description: "Schema violations, one per offending field",
              content: json({
                type: "object",
                properties: {
                  error: { type: "string" },
                  errors: {
                    type: "array",
                    items: { type: "string" },
                    example: ["palette.dark.accent: expected a hex colour"],
                  },
                },
              }),
            },
          },
        },
      },
      "/api/config/revert": {
        post: {
          tags: ["content"],
          summary: "Step the pointer back one version",
          description: "Blobs are never deleted, so this is non-destructive.",
          security: sessionOnly,
          responses: { 200: { description: "Reverted" }, 401: errorResponse, 409: errorResponse },
        },
      },
      "/api/cv/rebuild": {
        post: {
          tags: ["jobs"],
          summary: "Ask CI to re-render the PDF",
          description:
            "Typst is a native binary and its WASM build is ~10 MB gzipped, past " +
            "the Workers limit, so this dispatches cv.yml. That renders from the " +
            "published config and uploads to R2 — it does not deploy the site. " +
            "6/hour.",
          security: sessionOnly,
          responses: { 200: { description: "Queued" }, 401: errorResponse, 429: errorResponse, 503: errorResponse },
        },
      },
      "/api/stats/invalidate": {
        post: {
          tags: ["jobs"],
          summary: "Force the GitHub card to re-render",
          description:
            "Bumps `stats:version` so every cached variant misses. Cannot force " +
            "GitHub's image proxy to re-fetch. 12/hour.",
          security: sessionOnly,
          responses: { 200: { description: "Bumped" }, 401: errorResponse, 429: errorResponse },
        },
      },
      "/api/b": {
        post: {
          tags: ["public"],
          summary: "Create a byte-inspector permalink",
          description: "24 characters, 20 per hour per IP, 90-day TTL.",
          requestBody: {
            required: true,
            content: json({
              type: "object",
              properties: { value: { type: "string", maxLength: 24 } },
              required: ["value"],
            }),
          },
          responses: {
            200: {
              description: "Created",
              content: json({
                type: "object",
                properties: { id: { type: "string" }, url: { type: "string", example: "/b/fhz5nw" } },
              }),
            },
            400: errorResponse,
            429: errorResponse,
          },
        },
      },
      "/b/{id}": {
        get: {
          tags: ["public"],
          summary: "Open the inspector with a shared string",
          description:
            "Serves the page with the value injected, and rewrites the share " +
            "preview to the string and its byte count. Unknown ids fall back to " +
            "the ordinary page.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "HTML" } },
        },
      },
      "/gh/stats.svg": {
        get: {
          tags: ["public"],
          summary: "GitHub stats card",
          description:
            "For a GitHub profile README, not this site. Self-contained SVG, since " +
            "camo strips anything that would fetch. Cached a day per user+theme.",
          parameters: [
            { name: "theme", in: "query", schema: { type: "string", enum: ["dark", "light"], default: "dark" } },
            { name: "user", in: "query", schema: { type: "string" }, description: "Defaults to the published profile's login" },
          ],
          responses: {
            200: { description: "SVG", content: { "image/svg+xml": {} } },
            400: { description: "Bad user" },
            502: { description: "GitHub failed" },
            503: { description: "No token configured" },
          },
        },
      },
      "/cv.pdf": {
        get: {
          tags: ["public"],
          summary: "Résumé",
          description: "From R2 when CI has published a fresher copy, else the deployed one.",
          responses: { 200: { description: "PDF", content: { "application/pdf": {} } } },
        },
      },
      "/api/bytes": {
        get: {
          tags: ["public"],
          summary: "Inspect UTF-8 in either direction",
          description:
            "The hero widget as an endpoint. `?s=` encodes text to bytes, " +
            "`?hex=` decodes bytes back to text. Shells get a table, everything " +
            "else gets JSON so it composes with jq. Deterministic, so responses " +
            "are immutable and CORS-open.",
          parameters: [
            { name: "s", in: "query", schema: { type: "string", maxLength: 512 }, description: "Text to encode" },
            { name: "hex", in: "query", schema: { type: "string" }, description: "Bytes to decode; 0x, spaces and commas are tolerated" },
          ],
          responses: {
            200: {
              description: "Breakdown",
              content: json({
                type: "object",
                properties: {
                  input: { type: "string" },
                  bytes: { type: "integer" },
                  characters: { type: "integer" },
                  cells: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        offset: { type: "integer" },
                        byte: { type: "integer" },
                        hex: { type: "string" },
                        bin: { type: "string" },
                        char: { type: "string" },
                        lead: { type: "boolean", description: "False marks a continuation byte" },
                      },
                    },
                  },
                  codepoints: { type: "array", items: { type: "object" } },
                },
              }),
            },
            400: errorResponse,
          },
        },
      },
      "/api/health": {
        get: {
          tags: ["public"],
          summary: "Liveness, and diagnostics when signed in",
          description:
            "Anonymous callers get `{ ok }` only — naming bindings or secrets " +
            "would be reconnaissance. With a session it reports every store " +
            "probed rather than assumed, the published version, and where the " +
            "CV is being served from.",
          responses: {
            200: {
              description: "Healthy",
              content: json({ type: "object", properties: { ok: { type: "boolean" } } }),
            },
            503: { description: "A required store is unreachable" },
          },
        },
      },
      "/whoami": {
        get: {
          tags: ["public"],
          summary: "One-line summary, for shells",
          description:
            "Content-negotiated on User-Agent: curl/wget/httpie get plain text. " +
            "`/` and `/cv.txt` serve the full ANSI résumé the same way.",
          responses: { 200: { description: "Text", content: { "text/plain": {} } } },
        },
      },
    },
  };
}
