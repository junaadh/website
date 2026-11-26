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
  `lib/eitri/site.eith` is the host module scripts import as `"site"`.
- **Cloudflare Pages:** build command `bun run build`, output directory `out`.
