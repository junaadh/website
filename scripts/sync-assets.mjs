// Keeps generated files under public/eitri/ in sync. Run by postinstall,
// predev and prebuild, so a fresh checkout and CI need no manual step.
//
//  - web-tree-sitter.wasm: the tree-sitter runtime, copied from node_modules so
//    it always matches the installed web-tree-sitter version (git-ignored).
//  - sdk/index.json: the list of SDK declaration files (.eith) the console's
//    Docs tab offers. Drop a file into public/eitri/sdk/ and it shows up.
//
// tree-sitter-eitri.wasm and queries/highlights.scm in public/eitri/ are
// committed copies of the grammar repo's build output.

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "public", "eitri");
mkdirSync(out, { recursive: true });

const runtime = join(root, "node_modules", "web-tree-sitter", "web-tree-sitter.wasm");
if (existsSync(runtime)) {
  copyFileSync(runtime, join(out, "web-tree-sitter.wasm"));
} else {
  console.warn("sync-assets: web-tree-sitter is not installed, skipping its wasm");
}

const sdk = join(out, "sdk");
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".eith")) files.push(relative(sdk, path).split(sep).join("/"));
  }
};
if (existsSync(sdk)) walk(sdk);
// "site.eith" first, then its submodules alphabetically.
files.sort((a, b) => (a === "site.eith" ? -1 : b === "site.eith" ? 1 : a.localeCompare(b)));
writeFileSync(join(sdk, "index.json"), `${JSON.stringify(files, null, 2)}\n`);
