import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/generated");
const p = JSON.parse(
  await readFile(path.join(root, "src/data/profile.json"), "utf8"),
);
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
  (name) => path.join(root, "public/fonts", name),
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
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#171916"/>
<path d="M64 121H1136M64 534H1136" stroke="#414b36"/>
<g transform="translate(64 40) scale(.88)">${mark}</g>
<g font-family="IBM Plex Sans">
<text x="139" y="77" fill="#e7e9e1" font-size="24">${escape(p.name)}</text>
<text x="1136" y="77" text-anchor="end" fill="#a6af99" font-size="18">${escape(new URL(p.website).host)}</text>
<text x="64" y="186" fill="#a6af99" font-size="21">Hi, I’m ${escape(p.commonName)}. A developer from the Maldives.</text>
<text x="59" y="287" fill="#e7e9e1" font-size="82" font-weight="600" letter-spacing="-3">${escape(lines[0])}</text>
<text x="59" y="383" fill="#c5f66a" font-size="82" font-weight="600" letter-spacing="-3">${escape(lines[1])}</text>
<text x="64" y="475" fill="#bac5aa" font-size="23">${escape(p.social.label)}</text>
<circle cx="71" cy="579" r="5" fill="#c5f66a"/>
<text x="90" y="586" fill="#b8c4a9" font-size="18">${escape(current ? `${current.role} at ${current.company}` : p.title)}</text>
<text x="1136" y="586" text-anchor="end" fill="#a6af99" font-size="18">${escape(p.location)}</text>
</g></svg>`;
const png = render(svg, 1200);
const revision = createHash("sha256").update(png).digest("hex").slice(0, 12);
await mkdir(output, { recursive: true });
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
await writeFile(
  path.join(root, "public/robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${p.website}/sitemap.xml\n`,
);
await writeFile(
  path.join(root, "public/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(p.website)}/</loc></url></urlset>\n`,
);
console.log(
  `Generated icons, 1200×630 social card (${revision}), manifest, robots.txt, and sitemap.`,
);
