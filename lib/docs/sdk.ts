// The SDK reference, generated at build time from public/eitri/sdk/**/*.eith,
// the same files the console's Docs tab serves. Server only (it reads files).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type EithModule, parseEith } from "./eith";
import { FN_NOTES, MODULE_INFO, type ModuleInfo, VALUE_NOTES } from "./sdk-notes";

const SDK_DIR = join(process.cwd(), "public", "eitri", "sdk");

// Reading order. A file that is not listed here still gets a page, after these.
const ORDER = [
  "site",
  "site/theme",
  "site/fx",
  "site/ui",
  "site/keys",
  "site/time",
  "site/sound",
  "card",
];

export interface SdkModule extends EithModule {
  /** The last path segment, used in the URL: /docs/sdk/<slug>/ */
  slug: string;
  /** The declaration file, relative to /eitri/sdk/. */
  file: string;
  /** The raw file. */
  source: string;
  info: ModuleInfo;
}

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else if (entry.name.endsWith(".eith")) out.push(rel);
  }
  return out;
}

let cached: SdkModule[] | null = null;

export function sdkModules(): SdkModule[] {
  if (cached) return cached;
  const paths = walk(SDK_DIR).map((f) => f.replace(/\.eith$/, ""));
  paths.sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? ORDER.length : ia) - (ib === -1 ? ORDER.length : ib) || a.localeCompare(b);
  });
  const seen = new Set<string>();
  cached = paths.map((path) => {
    const file = `${path}.eith`;
    const source = readFileSync(join(SDK_DIR, file), "utf8");
    const parsed = parseEith(path, source);
    const slug = parsed.alias;
    if (seen.has(slug)) throw new Error(`docs: two SDK modules end in "${slug}"`);
    seen.add(slug);
    for (const fn of parsed.functions) {
      if (fn.doc.length === 0) {
        const note = FN_NOTES[`${path}#${fn.name}`];
        if (!note) throw new Error(`docs: ${path}.${fn.name} has no description`);
        fn.doc = [note];
      }
    }
    for (const v of parsed.values) {
      if (v.doc.length === 0) {
        const note = VALUE_NOTES[`${path}#${v.name}`];
        if (!note) throw new Error(`docs: ${path}.${v.name} has no description`);
        v.doc = [note];
      }
    }
    const info = MODULE_INFO[path] ?? { summary: parsed.intro[0] ?? "", limits: [], samples: [] };
    return { ...parsed, slug, file, source, info };
  });
  return cached;
}

export function sdkModule(slug: string): SdkModule | undefined {
  return sdkModules().find((m) => m.slug === slug);
}
