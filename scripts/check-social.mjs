import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const html = readFileSync("dist/index.html", "utf8");
const p = JSON.parse(readFileSync("src/data/profile.json", "utf8"));
const meta = JSON.parse(readFileSync("dist/generated/social.json", "utf8"));
const png = readFileSync(`dist${meta.path}`);
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
assert(
  meta.path.includes(
    createHash("sha256").update(png).digest("hex").slice(0, 12),
  ),
  "Card URL must change when image changes",
);
assert(
  html.includes(new URL(meta.path, p.website).href),
  "Initial HTML must reference this build’s image",
);
for (const key of [
  "og:title",
  "og:description",
  "og:image",
  "og:image:width",
  "og:image:height",
  "og:image:alt",
  "twitter:card",
  "twitter:image",
  "twitter:image:alt",
]) {
  assert.equal(
    (html.match(new RegExp(`(?:name|property)="${key}"`, "g")) || []).length,
    1,
    `${key} must appear exactly once`,
  );
}
const structured = JSON.parse(
  html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
);
assert.equal(structured.name, p.name);
assert.equal(
  structured.worksFor.name,
  p.experience.find((j) => j.current).company,
);
for (const [name, size] of [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  const icon = readFileSync(`dist/generated/${name}`);
  assert.equal(icon.readUInt32BE(16), size);
  assert.equal(icon.readUInt32BE(20), size);
}
assert(html.includes("/theme.js"), "Theme bootstrap must be in initial HTML");
assert(
  !html.includes("<!-- social-head -->"),
  "Metadata placeholder must be replaced",
);
console.log(
  "Verified initial-HTML social metadata, versioned 1200×630 PNG, app icon dimensions, and structured profile.",
);
