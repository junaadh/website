// Runs every docs sample against the real wasm and fails if one stops working.
//
//   node --experimental-strip-types scripts/check-docs.mjs
//
// - "site" samples (lib/docs/samples.ts) run in the site runtime with a fixed
//   clock and the project list from content/profile.json;
// - "card" samples run in the card runtime with lib/card/sample.ts's SAMPLE_USER;
// - DIAGNOSTICS must fail the way the docs say, with the exact report text;
// - the console's examples, the card presets and the default script are run too;
// - the SDK declaration files must parse with lib/docs/eith.ts, and every public
//   function must have a description.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRESETS } from "../lib/card/presets.ts";
import { SAMPLE_USER } from "../lib/card/sample.ts";
import { parseEith } from "../lib/docs/eith.ts";
import { DIAGNOSTICS, SAMPLES } from "../lib/docs/samples.ts";
import { FN_NOTES, VALUE_NOTES } from "../lib/docs/sdk-notes.ts";
import { loadCard, loadEitri } from "../lib/eitri/eitri.ts";
import { DEFAULT_SCRIPT, EXAMPLES } from "../lib/eitri/examples.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const bytes = readFileSync(join(root, "public/eitri/eitri.wasm"));
const wasm = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const profile = JSON.parse(readFileSync(join(root, "content/profile.json"), "utf8"));

const projects = profile.projects.map((p) => ({
  slug: p.slug,
  name: p.name,
  kind: p.kind,
  year: p.year,
  status: p.status,
  featured: p.featured,
  stack: p.stack,
}));
const env = { hour: 12, minute: 0, second: 0, weekday: 1, visits: 1 };

const site = await loadEitri(wasm, projects);
const card = await loadCard(wasm);

const failures = [];
let count = 0;
const check = (what, ok, detail = "") => {
  count++;
  if (!ok) failures.push(detail ? `${what}\n${detail}` : what);
};

for (const s of SAMPLES) {
  const r =
    s.kind === "card"
      ? card.render(s.source, SAMPLE_USER, s.params ?? {})
      : site.run(s.source, env);
  check(`sample ${s.id} (${s.kind}): ${r.outcome}`, r.outcome === "ok", r.report);
}

for (const d of DIAGNOSTICS) {
  const r = d.kind === "card" ? card.render(d.source, SAMPLE_USER, {}) : site.run(d.source, env);
  check(
    `diagnostic ${d.id}: expected ${d.outcome}, got ${r.outcome}`,
    r.outcome === d.outcome,
    r.report,
  );
  // The site's reports are coloured with ANSI codes; the docs show the plain text.
  const plain = r.report.replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "");
  check(`diagnostic ${d.id}: the report changed`, plain.trim() === d.report.trim(), plain);
}

for (const e of EXAMPLES) {
  const r = site.run(e.source, env);
  check(`console example ${e.id}: ${r.outcome}`, r.outcome === "ok", r.report);
}
{
  const r = site.run(DEFAULT_SCRIPT, env);
  check(`default script: ${r.outcome}`, r.outcome === "ok", r.report);
}
for (const p of PRESETS) {
  const r = card.render(p.source, SAMPLE_USER, {});
  check(`card preset ${p.id}: ${r.outcome}`, r.outcome === "ok", r.report);
}

const sdk = join(root, "public/eitri/sdk");
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".eith")) files.push(path);
  }
};
walk(sdk);
for (const file of files) {
  const name = file.slice(sdk.length + 1);
  try {
    const mod = parseEith(name.replace(/\.eith$/, ""), readFileSync(file, "utf8"));
    for (const fn of mod.functions) {
      check(
        `sdk ${mod.path}: ${fn.name} has no description`,
        fn.doc.length > 0 || Boolean(FN_NOTES[`${mod.path}#${fn.name}`]),
      );
    }
    for (const v of mod.values) {
      check(
        `sdk ${mod.path}: ${v.name} has no description`,
        v.doc.length > 0 || Boolean(VALUE_NOTES[`${mod.path}#${v.name}`]),
      );
    }
    check(`sdk ${mod.path}: no header comment`, mod.intro.length > 0);
  } catch (err) {
    check(
      `sdk ${name}: could not be parsed`,
      false,
      String(err instanceof Error ? err.message : err),
    );
  }
}

if (failures.length > 0) {
  console.error(`check-docs: ${failures.length} of ${count} checks failed\n`);
  for (const f of failures) console.error(`  x ${f.replaceAll("\n", "\n    ")}`);
  process.exit(1);
}
console.log(
  `check-docs: ${count} checks passed (${SAMPLES.length} samples, ${DIAGNOSTICS.length} diagnostics, ${EXAMPLES.length} examples, ${PRESETS.length} presets, ${files.length} SDK files)`,
);
