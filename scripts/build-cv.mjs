// Renders public/cv.pdf from content/profile.json with cv/resume.typ. Uses
// Typst ${version} from PATH (or TYPST_BIN); on macOS and Linux it can download
// the official release into node_modules/.cache/typst, verified against the
// SHA-256 checksums committed in cv/typst-release.json.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(await readFile(path.join(root, "cv/typst-release.json"), "utf8"));
const version = release.version;
const cache = path.join(root, "node_modules/.cache/typst", version);
let compiler = process.env.TYPST_BIN || "typst";
const installed = spawnSync(compiler, ["--version"], { encoding: "utf8" });
if (installed.status !== 0 || !installed.stdout.startsWith(`typst ${version} `)) {
  if (process.env.TYPST_BIN) throw new Error(`TYPST_BIN must point to Typst ${version}`);
  const target = release.targets[`${process.platform}-${process.arch}`];
  if (!target)
    throw new Error(
      `Install Typst ${version} and add it to PATH for ${process.platform}-${process.arch}`,
    );
  compiler = path.join(cache, `typst-${target.triple}`, "typst");
  try {
    await access(compiler);
  } catch {
    await mkdir(cache, { recursive: true });
    const url = `https://github.com/typst/typst/releases/download/v${version}/typst-${target.triple}.tar.xz`;
    console.log(`Downloading Typst ${version} from the official release…`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Typst download failed: HTTP ${response.status}`);
    const archive = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(archive).digest("hex") !== target.sha256)
      throw new Error("Typst archive checksum mismatch");
    const archivePath = path.join(cache, "typst.tar.xz");
    await writeFile(archivePath, archive);
    execFileSync("tar", ["-xJf", archivePath, "-C", cache], {
      stdio: "inherit",
    });
  }
}
/* Typst renders with --ignore-system-fonts, so an unreadable font directory does not
   fail — it quietly falls back to a built-in face and produces a CV in the wrong
   typeface. Fail here instead, where the cause is obvious. */
const fontPath = path.join(root, "assets/fonts");
try {
  await access(path.join(fontPath, "IBMPlexSans-Regular.ttf"));
} catch {
  throw new Error(`No IBM Plex Sans in ${fontPath}; the CV would render in the wrong typeface`);
}
// A failed render must stop the site build: never deploy yesterday's CV.
execFileSync(
  compiler,
  [
    "compile",
    "--root",
    root,
    "--ignore-system-fonts",
    "--font-path",
    path.join(root, "assets/fonts"),
    path.join(root, "cv/resume.typ"),
    path.join(root, "public/cv.pdf"),
  ],
  { stdio: "inherit" },
);
console.log("Generated public/cv.pdf from cv/resume.typ");
