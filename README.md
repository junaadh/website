# junaadh.com

Personal site. Next.js (App Router, static export) on Cloudflare Pages.

```sh
bun install
bun run dev      # http://localhost:3000
bun run check    # biome + oxlint + tsc
bun run build    # static site in out/
```

- **Content:** `content/profile.json`, typed and validated by `lib/profile.ts`.
- **Eitri:** `public/eitri/eitri.wasm` and `lib/eitri/eitri.ts` are copied from the
  eitri repo (`crates/eitri-wasm/build.sh`, then `dist/eitri.wasm` and `js/eitri.ts`).
  The SDK declarations scripts import (`site`, `site/theme`, `site/fx`, ...) are served from
  `public/eitri/sdk/` for the console's Docs tab.
- **Eitri runtime:** `lib/eitri/engine.ts` runs scripts and keeps their actions, handlers, key
  bindings, modes and timers alive; `model.ts` holds the limits. Cmd/Ctrl+K opens the command
  palette, the backtick opens the console.
- **Syntax highlighting:** `web-tree-sitter` plus `public/eitri/tree-sitter-eitri.wasm` and
  `highlights.scm` (committed copies of the `tree-sitter-eitri` build). `scripts/sync-assets.mjs`
  (run by postinstall, predev and prebuild) copies the tree-sitter runtime wasm out of
  `node_modules` (git-ignored, so it always matches the installed version) and regenerates
  `public/eitri/sdk/index.json`.
- **Card API:** `functions/api/card/[user].ts` serves `/api/card/<login>.svg` and `.json` as a Pages
  Function. The shared renderer (`lib/card/`) turns the effects of an Eitri `card` script into an
  SVG, in the browser (`/card` studio) and in the Worker. Set `GITHUB_TOKEN` (a Pages secret; for
  local use copy `.dev.vars.example` to `.dev.vars`) for full data; without it the REST fallback is
  used. `bun run dev:api` builds the site and serves it with the functions on :8788.
- **Docs:** `/docs` (`app/docs/`) covers the console, the Eitri language, the SDK and the card
  studio. The SDK reference is generated at build time from `public/eitri/sdk/**/*.eith` by
  `lib/docs/eith.ts` (descriptions the files lack live in `lib/docs/sdk-notes.ts`). Every code sample is
  in `lib/docs/samples.ts`; `scripts/check-docs.mjs` (part of `bun run check`) runs them all, the
  console examples and the card presets against `public/eitri/eitri.wasm`, so a sample that stops
  compiling fails the check. Card samples are also drawn at build time for the bundled sample profile.
- **Cloudflare Pages:** build command `bun run build`, output directory `out`.
