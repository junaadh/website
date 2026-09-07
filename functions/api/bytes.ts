import {
  codepoints,
  decode,
  fromBytes,
  parseHex,
  render,
  toCells,
} from "../../shared/bytes";
import type { Cell } from "../../shared/bytes";
import { accent, faint, fg, muted, paint, reset } from "../../shared/terminal";
import { wantsTerminal } from "../lib/terminal";

/** Pure computation, but not an open-ended one. */
const MAX_INPUT = 512;

const table = (input: string, cells: Cell[]) => {
  const chars = codepoints(cells);
  const rows = cells.map((cell, index) => {
    const offset = paint(faint, index.toString(16).padStart(4, "0"));
    const hex = paint(cell.lead ? accent : muted, render(cell.byte, "hex"));
    const dec = paint(muted, String(cell.byte).padStart(3));
    const bin = paint(faint, render(cell.byte, "bin"));
    const glyph = cell.lead
      ? paint(fg, JSON.stringify(cell.char))
      : paint(faint, "  ↳");
    return `  ${offset}  ${hex}  ${dec}  ${bin}  ${glyph}`;
  });
  return [
    "",
    `  ${paint(fg, JSON.stringify(input))}`,
    `  ${paint(muted, `${cells.length} bytes · ${chars.length} characters · UTF-8`)}`,
    "",
    `  ${paint(faint, "off   hex  dec  binary    char")}`,
    ...rows,
    "",
    ...chars
      .filter((entry) => entry.bytes.length > 1)
      .map(
        (entry) =>
          `  ${paint(fg, entry.char)} ${paint(muted, entry.codepoint)} ${paint(faint, "→")} ${paint(accent, entry.bytes.join(" "))}`,
      ),
    chars.some((entry) => entry.bytes.length > 1) ? "" : reset,
  ].join("\n");
};

/**
 * The hero's byte inspector as an endpoint, in both directions.
 *
 *   curl 'junaadh.dev/api/bytes?s=héllo ⚡'
 *   curl 'junaadh.dev/api/bytes?hex=68 c3 a9'
 *
 * Shells get a table; everything else gets JSON, so it composes with jq.
 */
export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const text = url.searchParams.get("s");
  const hex = url.searchParams.get("hex");

  if (text === null && hex === null)
    return Response.json(
      {
        error: "expected ?s=<text> or ?hex=<bytes>",
        examples: ["/api/bytes?s=hello", "/api/bytes?hex=68%2065%206c%206c%206f"],
      },
      { status: 400 },
    );

  const cells =
    hex !== null
      ? fromBytes(parseHex(hex.slice(0, MAX_INPUT * 3)))
      : toCells((text ?? "").slice(0, MAX_INPUT));
  const input = hex !== null ? decode(cells) : (text ?? "");

  const headers = {
    // Deterministic for a given input, so it can be cached hard.
    "cache-control": "public, max-age=31536000, immutable",
    "access-control-allow-origin": "*",
  };

  if (wantsTerminal(request))
    return new Response(table(input, cells) + "\n", {
      headers: { ...headers, "content-type": "text/plain; charset=utf-8" },
    });

  return Response.json(
    {
      input,
      encoding: "utf-8",
      bytes: cells.length,
      characters: codepoints(cells).length,
      cells: cells.map((cell, index) => ({
        offset: index,
        byte: cell.byte,
        hex: render(cell.byte, "hex"),
        bin: render(cell.byte, "bin"),
        char: cell.char,
        // False marks a continuation byte, i.e. the tail of a sequence.
        lead: cell.lead,
      })),
      codepoints: codepoints(cells),
    },
    { headers },
  );
};
