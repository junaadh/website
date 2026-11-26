# junaadh.dev

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
- **Cloudflare Pages:** build command `bun run build`, output directory `out`.
