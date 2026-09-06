# Junad / Portfolio

Dark, responsive React + TypeScript portfolio on Cloudflare Pages (`website`). Includes an interactive UTF-8 byte inspector, project filters, expandable experience, and a Typst résumé.

## Edit once, update both

Edit **`src/data/profile.json`** for experience, skills, projects, education, and contact details. React reads it directly; `cv/resume.typ` reads the same JSON. The build generates `public/cv.pdf` and `public/cv.md` before Vite copies them into `dist`.

The SME Digital entry is June 2026–present, Software Developer. Its descriptions are deliberately general. Keep private project names, endpoints, customer details, internal workflows, data samples, financial details, and credentials out of this repository. No private workspace is read during builds.

```sh
bun install --frozen-lockfile
bun run dev          # local website
bun run generate-cv  # refresh PDF + Markdown
bun run build        # refresh CV, typecheck, production build
bun run lint
node scripts/check-build.mjs # requires Poppler (pdfinfo, pdftotext)
```

Typst **0.14.2** is pinned. The build uses that version from PATH (or `TYPST_BIN`); on macOS/Linux it can also download the official binary into `node_modules/.cache/typst`, verified against committed SHA-256 checksums in `cv/typst-release.json`. First use needs network access and `tar`. Other platforms can install that Typst version manually. Only the committed static IBM Plex Sans fonts are used, so local and CI pagination match. No LaTeX, Pandoc, or external Typst packages are needed.

The PDF uses a spacious two-page layout: experience and education first, then projects and a technical toolkit. Edit the Typst template to change its styling. The Markdown and PDF are generated outputs; do not edit them directly. `cv: true` selects projects for the focused PDF; earlier school history remains in the site and Markdown.

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

`public/_headers` makes `/cv.pdf` and `/cv.md` revalidate. The old one-year immutable policy has been removed. Clients that already cached the old PDF may need a hard refresh once.

References: [Typst data loading](https://typst.app/docs/reference/data-loading/), [setup-typst](https://github.com/typst-community/setup-typst), [Cloudflare CI uploads](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [existing Git projects and direct uploads](https://developers.cloudflare.com/pages/get-started/direct-upload/).

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
