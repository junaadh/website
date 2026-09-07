import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveProfile } from "./live-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/generated");
const { profile: p } = await resolveProfile(root);
// Same tokens the site renders with, so the card matches what a visitor lands on.
const palette = JSON.parse(
  await readFile(path.join(root, "src/data/palette.json"), "utf8"),
);
const c = palette.dark;
const vars = (theme) =>
  Object.entries(palette[theme])
    .map(([name, value]) => `--${name}:${value}`)
    .join(";");
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
const fontFiles = ["IBMPlexSans-Regular.ttf", "IBMPlexSans-SemiBold.ttf"].map(
  (name) => path.join(root, "assets/fonts", name),
);
const render = (svg, width) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "IBM Plex Sans",
    },
  })
    .render()
    .asPng();
// One vector mark, shared by the favicon, app icons, and social card.
const mark = `<rect width="64" height="64" rx="14" fill="#171916"/><path fill="#e7e9e1" d="M29 13h9v8h-9zM22 26h16v20c0 9-5 14-14 14h-5v-8h5c4 0 5-2 5-6V34h-7z"/><rect x="46" y="43" width="9" height="9" rx="1" fill="#c5f66a"/>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${mark}</svg>`;
const lines = p.social.headline;
const current = p.experience.find((job) => job.current);

/* The hero's byte inspector, redrawn at card scale. Every cell is placed on an
   exact grid, so the bytes stay tabular without shipping a monospace face. */
const sample = "hello, world";
const bytes = [...new TextEncoder().encode(sample)];
const [cols, cellW, cellH, gridX, gridY] = [8, 44, 56, 764, 266];
const rows = Math.max(2, Math.ceil(bytes.length / cols));
const cells = Array.from({ length: rows * cols }, (_, i) => {
  const x = gridX + (i % cols) * cellW;
  const y = gridY + Math.floor(i / cols) * cellH;
  const byte = bytes[i];
  const filled =
    byte === undefined
      ? ""
      : `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${c.accent}" fill-opacity=".05"/>`;
  return `${filled}<text x="${x + 7}" y="${y + 18}" fill="${c.muted}" font-size="11">${i.toString(16).padStart(2, "0")}</text><text x="${x + 7}" y="${y + 43}" fill="${byte === undefined ? c.faint : c.accent}" font-size="19">${byte === undefined ? "··" : byte.toString(16).padStart(2, "0")}</text>`;
}).join("");
const rule = [
  ...Array.from(
    { length: cols + 1 },
    (_, i) => `M${gridX + i * cellW} ${gridY}v${rows * cellH}`,
  ),
  ...Array.from(
    { length: rows + 1 },
    (_, i) => `M${gridX} ${gridY + i * cellH}h${cols * cellW}`,
  ),
].join("");
const formats = ["HEX", "DEC", "BIN"]
  .map((label, i) => {
    const x = 1004 + i * 38;
    const box =
      i === 0
        ? `<rect x="${x}" y="414" width="36" height="22" fill="none" stroke="${c["strong-line"]}"/>`
        : "";
    return `${box}<text x="${x + 18}" y="429" text-anchor="middle" fill="${i === 0 ? c.accent : c.muted}" font-size="12">${label}</text>`;
  })
  .join("");
const inspector = `<text x="744" y="152" fill="${c.muted}" font-size="12" letter-spacing="1">A SMALL THING TO PLAY WITH</text>
<text x="1136" y="152" text-anchor="end" fill="${c.accent}" font-size="12">[ interactive ]</text>
<rect x="744" y="168" width="392" height="288" fill="url(#panel)" stroke="${c["visual-line"]}"/>
<path d="M744 212h392M744 402h392" stroke="${c["visual-line"]}"/>
<rect x="764" y="190" width="6" height="6" fill="${c.accent}"/>
<text x="780" y="197" fill="${c.muted}" font-size="13" letter-spacing="1">MEMORY VIEW</text>
<text x="1116" y="197" text-anchor="end" fill="${c.muted}" font-size="13">UTF-8 / BASE 16 / <tspan fill="${c.accent}">${bytes.length}</tspan> B</text>
<text x="764" y="247" fill="${c.accent}" font-size="17">&gt; write</text>
<text x="845" y="247" fill="${c.fg}" font-size="17">${escape(sample)}</text>
<path d="${rule}" stroke="${c["visual-line"]}"/>${cells}
<text x="764" y="430" fill="${c.muted}" font-size="13">Type something. See the bytes.</text>${formats}`;

const ticker = p.stack
  .map(escape)
  .join(`<tspan fill="${c.faint}">&#160;&#160;/&#160;&#160;</tspan>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="panel" x1="0" y1="0" x2=".7" y2="1">
<stop offset="0" stop-color="${c["visual-bg"]}"/><stop offset="1" stop-color="${c["visual-deep"]}"/>
</linearGradient></defs>
<rect width="1200" height="630" fill="${c.bg}"/>
<path d="M64 121H1136M64 534H1136" stroke="${c["visual-line"]}"/>
<g transform="translate(64 40) scale(.88)">${mark}</g>
<g font-family="IBM Plex Sans">
<text x="139" y="77" fill="${c.fg}" font-size="24">${escape(p.name)}</text>
<text x="1136" y="77" text-anchor="end" fill="${c.muted}" font-size="18">${escape(new URL(p.website).host)}</text>
<circle cx="70" cy="166" r="5" fill="${c.accent}"/>
<text x="88" y="172" fill="${c.muted}" font-size="17" letter-spacing="1.4">${escape(p.title.toUpperCase())}</text>
<text x="64" y="228" fill="${c.secondary}" font-size="25">Hi, I’m ${escape(p.commonName)}.</text>
<text x="59" y="306" fill="${c.fg}" font-size="72" font-weight="600" letter-spacing="-3">${escape(lines[0])}</text>
<text x="59" y="384" fill="${c.accent}" font-size="72" font-weight="600" letter-spacing="-3">${escape(lines[1])}</text>
<text x="64" y="436" fill="${c.secondary}" font-size="22">${escape(p.social.label)}</text>
<text x="64" y="482" fill="${c.accent}" font-size="22">+</text>
<text x="84" y="482" fill="${c.muted}" font-size="19">${escape(current ? `Currently building at ${current.company}` : p.title)}</text>
${inspector}
<text x="64" y="586" fill="${c.muted}" font-size="18" letter-spacing="1">${ticker}</text>
<text x="1136" y="586" text-anchor="end" fill="${c.muted}" font-size="18">${escape(p.location)}</text>
</g></svg>`;
const png = render(svg, 1200);
const revision = createHash("sha256").update(png).digest("hex").slice(0, 12);
await mkdir(output, { recursive: true });
// Only the current revision is referenced; older ones would ship as dead weight.
for (const stale of await readdir(output))
  if (/^social-.*\.png$/.test(stale) && stale !== `social-${revision}.png`)
    await rm(path.join(output, stale));
await writeFile(path.join(output, `social-${revision}.png`), png);
await writeFile(path.join(root, "public/social.png"), png);
await writeFile(path.join(root, "public/favicon.svg"), icon);
for (const [name, size] of [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  await writeFile(path.join(output, name), render(icon, size));
}
// ICO wraps the 32px PNG for older clients, without a second rendering dependency.
const small = render(icon, 32);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 32;
ico[7] = 32;
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(small.length, 14);
ico.writeUInt32LE(22, 18);
await writeFile(
  path.join(root, "public/favicon.ico"),
  Buffer.concat([ico, small]),
);
await writeFile(
  path.join(output, "social.json"),
  JSON.stringify(
    { path: `/generated/social-${revision}.png`, width: 1200, height: 630 },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(root, "public/site.webmanifest"),
  JSON.stringify(
    {
      name: p.name,
      short_name: p.handle,
      start_url: "/",
      display: "browser",
      background_color: "#171916",
      theme_color: "#171916",
      icons: [192, 512].map((size) => ({
        src: `/generated/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
    },
    null,
    2,
  ) + "\n",
);
/* Standalone so an unknown path costs no JS bundle; hosts serve /404.html for
   unmatched routes. Tokens come from the same palette as the site. */
await writeFile(
  path.join(root, "public/404.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="color-scheme" content="dark light" />
<meta name="theme-color" content="${c.bg}" />
<meta name="robots" content="noindex" />
<title>404 — not mapped | ${escape(p.name)}</title>
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<script src="/theme.js"></script>
<style>
@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url('/fonts/inter-latin.woff2') format('woff2');unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD}@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url('/fonts/inter-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF}
:root{color-scheme:dark;${vars("dark")}}
:root[data-theme=light]{color-scheme:light;${vars("light")}}
*{box-sizing:border-box}
body{margin:0;min-height:100svh;display:flex;flex-direction:column;justify-content:center;
background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;
font-family:Inter,"Helvetica Neue",Arial,sans-serif}
.wrap{width:min(1200px,calc(100% - 112px));margin-inline:auto}
@media(max-width:1050px){.wrap{width:calc(100% - 64px)}}
@media(max-width:760px){.wrap{width:calc(100% - 40px)}}
.mono{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
.eyebrow{font-size:12px;letter-spacing:1.3px;color:var(--muted);text-transform:uppercase}
h1{margin:22px 0 0;font-size:clamp(52px,8vw,76px);line-height:1.06;letter-spacing:-3px;font-weight:500}
h1 span{color:var(--accent)}
p{margin:24px 0 0;max-width:44ch;font-size:17px;line-height:1.75;color:var(--muted)}
.grid{display:flex;gap:1px;margin-top:44px;border:1px solid var(--visual-line);background:var(--visual-line);width:max-content;max-width:100%;overflow:hidden}
.grid b{display:grid;place-items:center;min-width:44px;height:52px;background:var(--visual-bg);
font-weight:400;font-size:16px;color:var(--faint)}
.grid b.on{color:var(--accent);background:var(--visual-deep)}
a.home{display:inline-flex;align-items:center;gap:14px;margin-top:40px;padding:16px 21px;
font-size:14px;background:var(--accent);color:var(--on-accent);text-decoration:none;
transition:background .2s,transform .2s}
a.home:hover{background:var(--accent-hover)}
@media(prefers-reduced-motion:no-preference){a.home:hover{transform:translateY(-2px)}}
</style>
</head>
<body>
<main class="wrap">
<p class="eyebrow mono">404 · address not mapped</p>
<h1>Nothing at this<br /><span>offset.</span></h1>
<p>That page isn’t in memory — it may have moved, or never existed. The rest of the site is still where you left it.</p>
<div class="grid mono" aria-hidden="true">
<b class="on">34</b><b class="on">30</b><b class="on">34</b><b>··</b><b>··</b><b>··</b><b>··</b><b>··</b>
</div>
<a class="home" href="/">Back to the start
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>
</a>
</main>
</body>
</html>
`,
);
await writeFile(
  path.join(root, "public/robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${p.website}/sitemap.xml\n`,
);
await writeFile(
  path.join(root, "public/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(p.website)}/</loc></url></urlset>\n`,
);
console.log(
  `Generated icons, 1200×630 social card (${revision}), 404 page, manifest, robots.txt, and sitemap.`,
);
