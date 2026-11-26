// A diagnostic as an SVG card, so a README author whose script does not
// compile sees the report in place of the image. Pure TypeScript.

import { esc, MONO } from "./render";

const WIDTH = 640;
const COLUMNS = 80;
const MAX_LINES = 28;
const LINE = 17;

/** Hard-wrap to the card's width and cap the length. */
function wrap(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.replace(/\t/g, "    ").split(/\r?\n/)) {
    const chars = Array.from(raw);
    if (chars.length === 0) out.push("");
    for (let i = 0; i < chars.length; i += COLUMNS) out.push(chars.slice(i, i + COLUMNS).join(""));
  }
  if (out.length > MAX_LINES) {
    out.length = MAX_LINES - 1;
    out.push("...");
  }
  return out;
}

export function renderError(report: string, heading = "eitri // card error"): string {
  const lines = wrap(report.trim() || "no details");
  const height = 64 + lines.length * LINE;
  const body = lines
    .map((line, i) => `<text x="24" y="${62 + i * LINE}" xml:space="preserve">${esc(line)}</text>`)
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="cd-title">`,
    `<title id="cd-title">${esc(heading)}</title>`,
    `<rect width="${WIDTH}" height="${height}" rx="6" fill="#0b1016"/>`,
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="6" fill="none" stroke="#f0715f" stroke-opacity="0.5"/>`,
    `<text x="24" y="30" fill="#f0715f" font-family="${MONO}" font-size="11" letter-spacing="1.6">${esc(heading.toUpperCase())}</text>`,
    `<path d="M24 40h${WIDTH - 48}" stroke="#f0715f" stroke-opacity="0.25"/>`,
    `<g fill="#d6dde4" font-family="${MONO}" font-size="12">${body}</g>`,
    "</svg>",
  ].join("");
}
