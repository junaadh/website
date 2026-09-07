import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const profile = JSON.parse(readFileSync("src/data/profile.json", "utf8"));
const pdf = readFileSync("dist/cv.pdf");
assert(pdf.subarray(0, 5).toString() === "%PDF-", "Built CV must be a PDF");
assert(
  pdf.equals(readFileSync("public/cv.pdf")),
  "Deployed PDF must match this build",
);
const text = execFileSync("pdftotext", ["-layout", "dist/cv.pdf", "-"], {
  encoding: "utf8",
});
for (const phrase of [
  profile.fullName,
  profile.experience[0].company,
  profile.experience[0].role,
  profile.experience[0].period,
  ...profile.projects.filter((p) => p.cv).map((p) => p.name),
]) {
  assert(text.includes(phrase), `CV is missing ${phrase}`);
}
/* Guards the font path: with --ignore-system-fonts a broken --font-path does not fail
   the render, it silently substitutes Typst's built-in serif. */
const fonts = execFileSync("pdffonts", ["dist/cv.pdf"], { encoding: "utf8" });
assert(
  /IBMPlexSans/.test(fonts) && !/Libertinus|DejaVu|NewCM/.test(fonts),
  `CV must embed IBM Plex Sans and no fallback face. pdffonts reported:\n${fonts}`,
);
const info = execFileSync("pdfinfo", ["dist/cv.pdf"], { encoding: "utf8" });
const pages = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
assert(
  pages >= 1 && pages <= 2,
  `Expected a focused CV of 1-2 pages, got ${pages}`,
);
const headers = readFileSync("dist/_headers", "utf8");
assert(
  headers.includes("must-revalidate") && !headers.includes("immutable"),
  "CV must revalidate after deployment",
);
console.log(
  `Verified ${pages}-page CV, current experience, projects, deployed PDF, and cache policy.`,
);
