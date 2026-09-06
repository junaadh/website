import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(
  await readFile(path.join(root, "cv/typst-release.json"), "utf8"),
);
const version = release.version;
const cache = path.join(root, "node_modules/.cache/typst", version);
let compiler = process.env.TYPST_BIN || "typst";
const installed = spawnSync(compiler, ["--version"], { encoding: "utf8" });
if (
  installed.status !== 0 ||
  !installed.stdout.startsWith(`typst ${version} `)
) {
  if (process.env.TYPST_BIN)
    throw new Error(`TYPST_BIN must point to Typst ${version}`);
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
    if (!response.ok)
      throw new Error(`Typst download failed: HTTP ${response.status}`);
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
// A failed render must stop the site build: never deploy yesterday's CV.
execFileSync(
  compiler,
  [
    "compile",
    "--root",
    root,
    "--ignore-system-fonts",
    "--font-path",
    path.join(root, "public/fonts"),
    path.join(root, "cv/resume.typ"),
    path.join(root, "public/cv.pdf"),
  ],
  { stdio: "inherit" },
);
const p = JSON.parse(
  await readFile(path.join(root, "src/data/profile.json"), "utf8"),
);
const markdown =
  [
    `# ${p.fullName}\n\n${p.title} · Systems & Full Stack\n\n${p.location} · ${p.phone} · [${p.email}](mailto:${p.email})\n\n[Portfolio](${p.website}) · [GitHub](${p.github})\n\n${p.summary}`,
    `## Experience\n\n${p.experience.map((j) => `### ${j.company} — ${j.role}\n\n${j.period} · ${j.location}\n\n${j.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")}`,
    `## Technical skills\n\n${p.skills.map((s) => `- **${s.name}:** ${s.items.join(", ")}`).join("\n")}`,
    `## Projects\n\n${p.projects
      .filter((p) => p.cv)
      .map(
        (p) =>
          `### [${p.name}](${p.url})\n\n${p.bullets.map((b) => `- ${b}`).join("\n")}`,
      )
      .join("\n\n")}`,
    `## Education\n\n${p.education.map((e) => `### ${e.institution}\n\n${e.period}\n\n${e.qualification}\n\n${e.details}`).join("\n\n")}`,
    `## Languages\n\n${p.languages.join(", ")}`,
  ].join("\n\n") + "\n";
await writeFile(path.join(root, "public/cv.md"), markdown);
console.log(
  "Generated public/cv.pdf and public/cv.md from src/data/profile.json",
);
