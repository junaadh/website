# junaadh.com

Source for [junaadh.com](https://junaadh.com), the portfolio of Moosa Junaadh. It is a static
Next.js site on Cloudflare Pages that visitors can script in
[Eitri](https://junaadh.com/work/eitri/), a statically typed scripting language compiled to
WebAssembly. It also has a GitHub profile card API that runs the same language at the edge.

<p align="center">
  <img src="https://junaadh.com/api/card/junaadh.svg?preset=classic" alt="GitHub card for junaadh">
</p>

## Features

- **Portfolio.** Projects, experience and skills come from one JSON file, which is typed and
  checked at build time.
- **Scriptable console.** Press the backtick key to open it, or `⌘K` / `Ctrl K` for the command
  palette. Scripts can register actions, key bindings, event handlers and timers, and can restyle
  the page through a typed SDK (`site`, `site/theme`, `site/fx`, `site/ui`, `site/keys`,
  `site/time`, `site/sound`). The editor uses tree-sitter for syntax highlighting.
- **GitHub card studio and API.** `/card` designs a profile card with an Eitri script, and
  `/api/card/<login>.svg` renders it for embedding in a README.
- **Documentation.** `/docs` covers the console, the language, the SDK reference and the card
  HTTP API. Every code sample is run against the real runtime in CI.
- **CV.** The site build renders `/cv.pdf` from the same profile data with Typst.

## Card gallery

Live cards for this account, one per preset:

|                                                                                          |                                                                                          |
| :--------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------: |
|    ![classic](https://junaadh.com/api/card/junaadh.svg?preset=classic) <br> `classic`    | ![languages](https://junaadh.com/api/card/junaadh.svg?preset=languages) <br> `languages` |
|    ![heatmap](https://junaadh.com/api/card/junaadh.svg?preset=heatmap) <br> `heatmap`    |  ![terminal](https://junaadh.com/api/card/junaadh.svg?preset=terminal) <br> `terminal`   |
| ![synthwave](https://junaadh.com/api/card/junaadh.svg?preset=synthwave) <br> `synthwave` |       ![repos](https://junaadh.com/api/card/junaadh.svg?preset=repos) <br> `repos`       |
|    ![minimal](https://junaadh.com/api/card/junaadh.svg?preset=minimal) <br> `minimal`    |       ![badge](https://junaadh.com/api/card/junaadh.svg?preset=badge) <br> `badge`       |

Every preset is an Eitri script. Open one in the [card studio](https://junaadh.com/card/) to edit it.

## Tech stack

| Area                | Choice                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| Framework           | Next.js 16 (App Router, static export), React 19                               |
| Language            | TypeScript 7                                                                   |
| Styling             | Tailwind CSS 4                                                                 |
| Runtime for scripts | Eitri compiled to `wasm32`, `web-tree-sitter` for highlighting                 |
| Hosting             | Cloudflare Pages, with Pages Functions for the card API and KV for short links |
| Tooling             | Bun, Biome, oxlint, Typst (pinned and checksum-verified)                       |

## Getting started

Requirements: [Bun](https://bun.sh) 1.4 or later and Node.js 22 or later.

```sh
bun install
bun run dev        # http://localhost:3000
```

To work on the card API, run the built site together with its Functions:

```sh
cp .dev.vars.example .dev.vars   # optional: add a GITHUB_TOKEN
bun run dev:api                  # http://localhost:8788
```

### Scripts

| Command           | What it does                                                                         |
| ----------------- | ------------------------------------------------------------------------------------ |
| `bun run dev`     | Development server                                                                   |
| `bun run build`   | Renders the CV and builds the static site into `out/`                                |
| `bun run check`   | Runs Biome, oxlint, `tsc` for the app and the Functions, and the docs sample checker |
| `bun run cv`      | Renders `public/cv.pdf` on its own                                                   |
| `bun run dev:api` | Builds the site and serves it with the Functions via `wrangler pages dev`            |

## Project structure

```
app/                Routes: home, /work/[slug], /card, /docs, share images (/og/*.png), metadata routes
components/         UI: HUD chrome, console, card studio, docs
content/profile.json    All portfolio content
lib/
  eitri/            Wasm wrapper, script engine, key bindings, limits, highlighting
  card/             Card renderer (effects → SVG), presets, share links
  docs/             SDK reference generator and code samples
functions/          Cloudflare Pages Functions: /api/card/<login>, /api/card/scripts
public/eitri/       eitri.wasm, the tree-sitter grammar and the SDK declarations (.eith)
cv/                 Typst source for the CV
scripts/            Asset sync, CV build and the docs sample checker
```

## Configuration

The card API reads these from the Pages project (_Settings → Variables and Secrets_). For local
development they go in `.dev.vars`.

| Name             | Kind                 | Purpose                                                                                                                                               |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`   | Secret, optional     | A fine-grained token with **Metadata: Read-only** on all repositories. Without it the API uses public endpoints only and leaves contributed-to empty. |
| `GITHUB_PRIVATE` | Variable, optional   | Set to `false` to keep private repositories out of the owner's card.                                                                                  |
| `CARDS`          | KV binding, optional | Stores saved card scripts for short `?script=<id>` links. Without it the studio falls back to long `?s=` links.                                       |

Private repositories count only on the card of the login named in `content/profile.json`. Their
names never appear on the card.

## Card API

```md
![GitHub card](https://junaadh.com/api/card/<login>.svg?preset=classic)
```

| Endpoint                     | Description                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/card/<login>.svg`  | Renders a card. Use `?preset=<id>`, `?script=<id>` or `?s=<encoded script>`; other query parameters are passed to the script. |
| `GET /api/card/<login>.json` | The normalised profile data a script receives.                                                                                |
| `POST /api/card/scripts`     | Saves a script (same origin only, up to 16 KB, only if it renders) and returns `{ "id" }`.                                    |

The full reference is at [junaadh.com/docs/card/api](https://junaadh.com/docs/card/api/).

## Deployment

Pushes to `master` deploy through GitHub Actions (`.github/workflows/ci.yml`). The workflow runs
`bun run check` and `bun run build`, then `wrangler pages deploy out` to the `website` Pages
project. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets; without
the token the deploy step is skipped. Secrets on the Pages project apply only to new deployments,
so redeploy after changing one.

## Security

- **Script sandbox.** Visitor scripts run in WebAssembly with step, memory, host-call and
  output limits, and can only act through the SDK. Shared console links wait for the visitor to
  press Run. Visiting with `?safe` clears a saved script.
- **Card output.** Rendered SVGs are sanitised and served with a restrictive
  `Content-Security-Policy`.
- **Static pages.** `public/_headers` sets the CSP, `frame-ancestors 'none'`, HSTS and related
  headers.
- **Edge limits.** Configure rate limiting for `/api/card/*` as a Cloudflare WAF rule.
- **Reporting.** Report vulnerabilities to the contact in
  [`/.well-known/security.txt`](https://junaadh.com/.well-known/security.txt). It expires on
  2027-11-26 and needs renewing before then.

## Updating Eitri

`public/eitri/eitri.wasm` and `lib/eitri/eitri.ts` are build outputs of the Eitri repository:

1. Run `crates/eitri-wasm/build.sh` there.
2. Copy `dist/eitri.wasm` and `js/eitri.ts` here, keeping the browser-only differences in
   `lib/eitri/eitri.ts`.
3. Copy `crates/eitri-wasm/sdk/*.eith` into `public/eitri/sdk/`.

The syntax-highlighting grammar comes from the `tree-sitter-eitri` build in the same way. Run
`bun run check` afterwards: it runs every documented sample, example and preset against the new
runtime.
