# Junad / Portfolio

Dark, responsive React + TypeScript portfolio on Cloudflare Pages (`website`). Includes an interactive UTF-8 byte inspector, project filters, expandable experience, and a Typst résumé.

## Edit once, update both

Edit **`src/data/profile.json`** for experience, skills, projects, education, and contact details. React reads it directly; `cv/resume.typ` reads the same JSON. The build generates `public/cv.pdf` before Vite copies it into `dist`.

The SME Digital entry is June 2026–present, Software Developer. Its descriptions are deliberately general. Keep private project names, endpoints, customer details, internal workflows, data samples, financial details, and credentials out of this repository. No private workspace is read during builds.

```sh
bun install --frozen-lockfile
bun run dev          # Vite HMR + Pages Functions + local KV/D1/R2, on one port
bun run dev:vite     # Vite alone, when Functions are irrelevant
bun run generate-cv  # refresh PDF + Markdown
bun run build        # refresh CV, typecheck, production build
bun run lint
bun run test
node scripts/check-build.mjs # requires Poppler (pdffonts, pdfinfo, pdftotext)
```

`bun run dev` (`scripts/dev.mjs`) starts Vite on a free port and puts Wrangler in front
of it, so `http://localhost:8788` serves the Functions, the edge rewrite and the React app
with hot reload from a single origin — the same shape as production. Two details are load
bearing: Vite is bound to `::1` because Wrangler's `--proxy` resolves IPv6 only, and the
R2 binding is called `MEDIA` rather than `ASSETS` because **`ASSETS` is reserved in Pages
Functions** — binding it shadows the one `context.next()` uses and every HTML request
fails with `env.ASSETS.fetch is not a function`.

**Two font directories, deliberately.** `assets/fonts/` is build-only — the IBM Plex faces
resvg and Typst read, never served. `public/fonts/` is runtime — the self-hosted Inter the
browser downloads.

Inter is a variable woff2 (latin 23.5 kB + latin-ext 36 kB, `font-display: swap`, latin
preloaded), covering the 400/500/700 the site uses from one file. It is self-hosted so the
page makes no third-party request; the licence ships beside it as OFL requires.

Note for the CV: Typst 0.14.2 keys font families off name ID 1, and IBM Plex's static
SemiBold declares that as `IBM Plex Sans SmBld` — name ID 16 correctly says
`IBM Plex Sans`/`SemiBold`, but that is not what is read. So `weight: 600` silently
resolved to the Regular face. `cv/resume.typ` names the family Typst actually registers,
via a `semi` binding and a `show strong` rule, and the PDF now embeds both faces.

Typst **0.14.2** is pinned. The build uses that version from PATH (or `TYPST_BIN`); on macOS/Linux it can also download the official binary into `node_modules/.cache/typst`, verified against committed SHA-256 checksums in `cv/typst-release.json`. First use needs network access and `tar`. Other platforms can install that Typst version manually. Only the committed static IBM Plex Sans fonts are used, so local and CI pagination match. No LaTeX, Pandoc, or external Typst packages are needed.

The PDF uses a spacious two-page layout: experience and education first, then projects and a technical toolkit. Edit the Typst template to change its styling. The PDF is a generated output; do not edit it directly. `cv: true` selects projects for the focused PDF; earlier school history remains in the site and Markdown.

## GitHub Actions + Cloudflare Pages

`.github/workflows/deploy.yml` runs on **every push**, pull request, and manual dispatch. It lints, renders the PDF with Typst, builds the website, verifies the PDF text and caching policy, and saves the PDF and complete site as downloadable artifacts. It does not create bot commits.

### Existing Pages Git integration (works without new secrets)

Keep the current Git integration, production branch `master`, build command **`bun run build`**, output directory **`dist`**. Set the Pages build environment to Node 22 and Bun 1.4.2 (`NODE_VERSION=22`, `BUN_VERSION=1.4.2`). Since CV rendering is part of the build command, each Pages deployment gets the matching PDF even while the GitHub deployment job is disabled. GitHub Actions independently renders and validates it on each push.

### Deploy the GitHub Actions artifact directly

For GitHub Actions to own deployment to the existing **`website`** Pages project:

1. Add repository Actions secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The token needs **Account / Cloudflare Pages / Edit** for the account that owns `website`.
2. Disable automatic production and preview branch deployments in the existing Pages project's Git build settings to prevent duplicate/racing deployments. Keep the project and custom domain.
3. Set the repository Actions variable `CLOUDFLARE_DEPLOY_ENABLED` to `true`.
4. Push to `master` or run the workflow on `master`. After checks pass, the exact verified `dist` artifact deploys to `website`, including `/cv.pdf`.

Other branches and pull requests only build and upload artifacts. Cloudflare credentials are available only in the deployment job. The deployment is deliberately disabled until the account configuration is ready; no secrets are required to validate a pull request. Existing Git integration continues updating the CV without this opt-in.

`public/_headers` makes `/cv.pdf` revalidate. The old one-year immutable policy has been removed. Clients that already cached the old PDF may need a hard refresh once.

References: [Typst data loading](https://typst.app/docs/reference/data-loading/), [setup-typst](https://github.com/typst-community/setup-typst), [Cloudflare CI uploads](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [existing Git projects and direct uploads](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Live config at the edge (Pages Functions)

`functions/_middleware.ts` rewrites the built HTML at the edge so published content
reaches crawlers in the initial response instead of after a client fetch. It replaces the
`<title>`, description, OpenGraph/Twitter `content` attributes and JSON-LD **in place**
(never appending, so `scripts/check-social.mjs` keeps passing), and injects a palette
`<style>` plus a `<script type="application/json" id="live-config">` the app hydrates from.

**Nothing published means nothing changes.** With no `CONFIG` binding, an empty
namespace, or a blob that fails validation, the middleware is a pass-through and the site
renders the JSON committed in `src/data/`. `src/config.ts` prefers the injected blob and
falls back to those same imports, so `vite dev` — which has no Worker — is unaffected.

Storage is version-keyed and immutable: `config:v<N>` is written first, then the
`config:version` pointer is bumped, so a half-finished publish is never observable and a
new version simply misses the old cache entry rather than needing a purge. Reads are
served from an in-isolate memo keyed by version, so the config *blob* is fetched only when
the version actually changes. The tiny `config:version` pointer is read on every request,
but with `cacheTtl` so it comes from the local PoP rather than origin — one cheap lookup,
not a round trip. Rendered HTML is additionally cached under a version-keyed Cache API
entry. Publish propagation is bounded by that pointer TTL (60s).

`shared/config.ts` holds the schema, shared by the app and the Functions and validated on
every write. Colours are hex-only and project/profile URLs must be absolute `http(s)`, so
a published blob cannot smuggle CSS or a `javascript:` href into the page.
`bun run test` covers this, including that the committed data validates as-is.

```sh
cp wrangler.example.toml wrangler.toml   # then fill in real binding ids
bun run build
bun run dev                              # or the built output:
bunx wrangler pages dev dist --kv=CONFIG
```

## Admin authentication

Passkey to sign in, TOTP only to recover. There is no password login.

**First run.** `/api/auth/bootstrap` accepts a short-lived HS256 JWT signed with the
`BOOTSTRAP_JWT_SECRET` Worker secret and returns a single-use password valid ten minutes,
plus the TOTP secret to enrol:

```sh
bunx wrangler pages secret put BOOTSTRAP_JWT_SECRET --project-name=website
BOOTSTRAP_JWT_SECRET=… node scripts/bootstrap-token.mjs   # prints the curl
```

Register the first passkey with that password **and** a TOTP code — the code is required,
so the recovery factor can never be left un-enrolled. That would recreate exactly the
lockout this design exists to avoid. Registering the first passkey closes bootstrap: it
answers `403` from then on.

**Recovery.** A TOTP code at `/api/auth/recover` mints a fresh ten-minute password, which
`/api/auth/register` accepts in place of a session so a replacement passkey can be
enrolled. Rate limited to 5 attempts per 15 minutes, since six digits is the whole barrier
there. **Break-glass:** set `bootstrap_armed` to `yes` in the `state` table to reopen
bootstrap — reachable through the Cloudflare dashboard, never over the public API.

Tokens are single use (`jti` recorded in `used_tokens`), capped at one hour of life
regardless of what they claim, and pinned to `HS256` so `alg: none` and algorithm
confusion are rejected. Passwords are stored only as SHA-256 hashes; sessions are
server-side rows keyed by a hash of the cookie, so a session can be revoked. Cookies are
`HttpOnly; SameSite=Strict` and `Secure` whenever the scheme allows.

The D1 tables apply themselves on first use (`functions/lib/schema.ts`), so there is no
migration step to forget. `bun run test` covers the TOTP implementation against the
RFC 6238 vectors and the JWT verifier against ten rejection cases.

```sh
bunx wrangler pages dev dist --kv=CONFIG --d1=AUTH   # local Functions, KV and D1
```

## Admin panel

`/admin` is a **separate Vite entry** (`admin.html` → `src/admin/`), not a route in the
site, so the public bundle never carries the editor or the WebAuthn client. It costs
21 kB on top of the React chunk both entries already share. It is `noindex` in the markup,
`X-Robots-Tag: noindex` and `no-store` in `public/_headers`, absent from the sitemap, and
skipped by the edge rewriter so its own title survives.

Everything is a form; there is no JSON to hand-edit. Basics, social/SEO copy, the palette
(colour picker plus an authoritative hex field, since a colour input cannot express 8-digit
hex) and the feature flags, plus full editors for experience, projects, skills and
education — collapsible cards with add, reorder and a two-step remove. Reordering is
buttons rather than drag: keyboard reachable, no pointer precision needed, and it cannot
half-drop.

`category` and `motif` are `<select>`s driven by `categories` and `motifs` in
`shared/config.ts`, because both drive rendering by exact string match — a typo silently
falls through to the wrong project graphic. The validator enforces the same two sets, and a
value outside them is shown as *unrecognised* rather than being quietly snapped to a
default. Validation failures are rewritten from `profile.projects[7].name` to
`Projects · item 8 · name`, so an error points at a card instead of an array index.

`GET /api/config` is public — it returns exactly what the page already shows — and seeds
from the committed JSON so the editor always opens on current content. `PUT /api/config`
and `POST /api/config/revert` require a session and answer `401` without one. Invalid
input is refused with `422` and per-field paths, e.g.
`palette.dark.accent: expected a hex colour`.

### Demo the whole flow locally

```sh
echo 'BOOTSTRAP_JWT_SECRET = "local-test-secret"' > .dev.vars   # gitignored
bun run dev

node scripts/bootstrap-token.mjs --run    # handshake + QR + password
```

`--run` performs the handshake and prints a scannable QR for the `otpauth://` URI, the
password, and the secret. Scan it with any authenticator app. (`node scripts/totp.mjs
<secret>` generates codes on the machine instead, for when no phone is around; it is an
independent RFC 6238 implementation and matches the Worker's.)

Then open **`http://localhost:8788/admin`**, paste the password and a code from the phone,
and register the passkey.

**Using the phone for the passkey too.** No tunnel needed. In the browser's passkey dialog
choose *Use a phone or tablet* — the **browser** shows its own QR, the phone scans it and
does Face ID / fingerprint, and the credential is stored on the phone. This is WebAuthn's
cross-device (hybrid) flow and it works against `http://localhost` unchanged; the laptop
is still the relying party.

**Browsing from the phone** is the one case that needs a public hostname. The phone's
`localhost` is the phone, and a LAN IP like `192.168.1.5` cannot be a relying-party ID —
WebAuthn requires a domain. Put a tunnel in front instead:

```sh
cloudflared tunnel --url http://localhost:8788     # → https://<random>.trycloudflare.com
```

`relyingParty()` derives the ID and origin from the request, so that hostname just works.
Note the quick-tunnel hostname changes on every run, so a passkey registered against one is
useless after a restart — fine for a demo, not for repeated use.

Three things to know:

- **Use `localhost`, never `127.0.0.1`.** Relying-party IDs must be domains; an IP literal
  is rejected. `http://localhost` is a secure context by spec, so no HTTPS is needed.
- **A passkey registered locally will not work in production.** The relying-party ID is the
  hostname, so a `localhost` credential is scoped to `localhost`. Bootstrapping the real
  site is a separate, fresh run of the same flow — and the local demo cannot lock you out
  of production.
- **`rm -rf .wrangler/state` resets everything** — credentials, TOTP secret, published
  config — so the first-run flow can be demonstrated again. Registering a passkey closes
  bootstrap locally exactly as it does in production.

For production, set the secret with `bunx wrangler pages secret put BOOTSTRAP_JWT_SECRET
--project-name=website` and pass `--url=https://junaadh.dev`.

## Public endpoints

**`curl junaadh.dev`** returns the résumé as ANSI text, as does `/cv.txt`; `/whoami` is a
one-liner. Detection is a strict **allowlist** of shell agents (`curl`, `wget`, `httpie`,
…) — never a browser blocklist — so browsers *and every crawler* keep getting HTML.
Verified against Googlebot, Twitterbot, facebookexternalhit and Slackbot.
`curl -H 'accept: text/html'` opts back into the page.

**Byte permalinks.** The hero inspector's share button posts to `/api/b` and returns
`/b/<id>`, a real page that reopens the inspector with that string. Public write, so it is
narrow: 24 characters (the input's own cap), 20 per hour per IP, 90-day TTL. The share
preview carries the string and its byte count — `"héllo ⚡" — 10 bytes` — and the page is
`noindex`. The preview *image* stays the standard card; a per-link one would need
`resvg-wasm` (~925 kB gzipped) in the bundle that serves every request, which is a bad
trade for a thumbnail.

Per-section OG images were considered and dropped: URL fragments are never sent to the
server, so `junaadh.dev/#work` transmits only `/` and the Worker cannot know which section
was shared. Not a size problem — a structural one.

**GitHub stats card** at `/gh/stats.svg?theme=dark`, for the GitHub profile README rather
than this site:

```md
![stats](https://junaadh.dev/gh/stats.svg?theme=dark)
```

The login is read from the published profile's GitHub URL, so it follows the site;
`?user=` overrides it. This is the one endpoint that genuinely needs `GITHUB_TOKEN`:
GitHub's GraphQL API has no anonymous access at all, and the commit total is GraphQL-only.
Self-contained SVG — no external fonts or images, because GitHub proxies README images
through camo and strips anything that would fetch. Cached in KV for a day per
user+theme; the panel's *Refresh GitHub card* bumps `stats:version` so every variant misses
at once. **Caveat:** that guarantees a fresh render, not a fresh fetch by GitHub — camo
caches on its own schedule.

## The CV pipeline

Typst is a native binary, and its WASM build measures **27 MB raw / 10.24 MB gzipped** —
past even the paid Workers limit before fonts or code. So the PDF is not rendered at the
edge. `/api/cv/rebuild` (authenticated) dispatches **`.github/workflows/cv.yml`**, which
renders the PDF, verifies it, and uploads it to R2 — and does nothing else. No site build,
no deployment; the running site is untouched and `functions/cv.pdf.ts` simply starts
serving the newer object. It skips the dependency install too, since `build-cv.mjs` needs
only Node builtins and the Typst CLI.

A Cloudflare deploy hook would avoid the credential but redeploys the entire site to change
a line of text, so it is deliberately not used. Being targeted costs a token because
`workflow_dispatch` requires auth.

**Two separate, minimal tokens**, so neither can do the other's job if it leaks:

| | grant |
|---|---|
| `GITHUB_CV_TOKEN` | fine-grained, **only** the `website` repo, **Actions: read and write**, nothing else |
| `GITHUB_STATS_TOKEN` | fine-grained, all repositories, **Metadata: Read-only** — nothing else |

Metadata read is the *minimum* fine-grained repository permission, and it is what lets
private repositories count toward commits, stars and language totals. It grants repo names,
languages and stars, and explicitly **not** code, issues, PRs, Actions, secrets or settings.
Repository names are never rendered — the `Stats` type carries only aggregates, so no name
can structurally reach the SVG; the card only says *"incl. N private"* so the numbers are
not silently different from your profile page.

Set `GITHUB_STATS_PRIVATE = "false"` to keep the card public-only even with a broader token,
or scope the token to public repositories instead. The two shapes are cached separately.

Both rebuild and invalidate are rate limited (6/hr and 12/hr), because a live session should
not be able to hammer CI or the GitHub API. `profile.github` is admin-editable, so the owner
it yields is validated as a plain login before being interpolated into an API path — a
crafted URL must not be able to redirect the dispatch at another repository.

Builds render from **published** content, not committed content: `scripts/live-profile.mjs`
fetches `SITE_CONFIG_URL` (the public `/api/config`) and falls back to the committed JSON
when unset, offline, or nothing is published, so a build never breaks on a network blip.
Typst reads the generated `src/data/profile.build.json` rather than the tracked file, so
rendering live content mutates nothing under version control.

`functions/cv.pdf.ts` serves the R2 copy ahead of the deployed one, falling back to the
built PDF whenever R2 is empty or unreachable. `deploy.yml` refreshes R2 on a normal deploy
too, so the object never lags behind the deployment.

Everything else the panel publishes is live within the pointer TTL; only the PDF is
eventually-consistent, by about a CI run.

## Theme and personal touches

Auto follows the operating system, including changes while the page is open. Light uses muted paper and olive tones; Dark uses softened charcoal. The floating corner bubble opens an appearance panel with Auto, Light, and Dark choices. Preferences persist locally and synchronize across tabs. The panel supports keyboard navigation, Escape, and outside-click dismissal. `public/theme.js` runs before styles load to avoid a flash of the wrong theme. Storage failures fall back gracefully. No sticky navigation bar is used.

SVG arrows render consistently across mobile platforms without emoji substitution. Entrance animations, scroll reveals, staggered project filters, byte updates, and hover details respect the operating system's reduced-motion preference.

## Generated social previews and icons

`bun run generate-social` uses the shared profile’s `social` fields to render the 1200×630 PNG, matching `j.` favicon, PNG app icons, manifest, robots.txt, and sitemap. Both `bun run dev` and `bun run build` run the generator automatically. Restart dev after changing the social card template to regenerate it.

The generator uses the Rust-based `@resvg/resvg-js` renderer and committed IBM Plex Sans font files, so CI needs no browser, font download, or external image API. Fonts are distributed under the included SIL Open Font License. Edit `scripts/build-social.mjs` for the icon and card layout.

The Vite HTML transform emits Open Graph, X large-image card metadata, canonical URL, and Person structured data into the initial HTML for crawlers. The social image URL contains a hash of the image to avoid reusing old cached previews after a content change. `/social.png` remains a stable fallback. Sharing services may need a re-scrape for posts they already cached.

Generated size variants and versioned cards live in ignored `public/generated/` and are rebuilt into `dist` on every push. `node scripts/check-social.mjs` verifies the rendered assets and initial-HTML metadata. `bun run test` checks system preferences, overrides, persistence, cross-tab synchronization, and blocked storage.

References: [Open Graph protocol](https://ogp.me/), [resvg-js](https://github.com/thx/resvg-js).

The about section loads the current avatar directly from `https://github.com/junaadh.png?size=144`; it is not copied into the build. GitHub profile-picture changes appear after GitHub/browser caches refresh, without a portfolio rebuild. `name` is Junad; `commonName` is Junaadh for the personal greeting; `fullName` is Moosa Junad for the CV.
