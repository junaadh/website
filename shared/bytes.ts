/**
 * UTF-8 inspection, shared by the hero widget, /api/bytes and the terminal.
 * Pure and isomorphic: no DOM, no Workers globals.
 */

export type Cell = {
  byte: number;
  /** The character this byte belongs to; a run shares one. */
  char: string;
  lead: boolean;
  last: boolean;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const bases = { hex: 16, dec: 10, bin: 2 } as const;
const widths = { hex: 2, dec: 3, bin: 8 } as const;
export type Base = keyof typeof bases;

export const render = (byte: number, base: Base) =>
  byte.toString(bases[base]).padStart(widths[base], "0");

/** Splits text into bytes, remembering which character each came from. */
export function toCells(value: string): Cell[] {
  const cells: Cell[] = [];
  for (const char of value) {
    const bytes = encoder.encode(char);
    for (let i = 0; i < bytes.length; i++)
      cells.push({
        byte: bytes[i],
        char,
        lead: i === 0,
        last: i === bytes.length - 1,
      });
  }
  return cells;
}

/** Groups raw bytes into UTF-8 sequences, so a run still reads as one glyph. */
export function fromBytes(bytes: number[]): Cell[] {
  const cells: Cell[] = [];
  let at = 0;
  while (at < bytes.length) {
    const lead = bytes[at];
    const length = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 1;
    const run = bytes.slice(at, at + length);
    const char = decoder.decode(new Uint8Array(run));
    run.forEach((byte, index) =>
      cells.push({
        byte,
        char,
        lead: index === 0,
        last: index === run.length - 1,
      }),
    );
    at += run.length;
  }
  return cells;
}

/** Accepts whatever hex someone pastes: 0x prefixes, spaces, commas, newlines. */
export function parseHex(input: string) {
  const clean = input.replace(/0x/gi, "").replace(/[^0-9a-f]/gi, "");
  const bytes: number[] = [];
  for (let i = 0; i + 2 <= clean.length; i += 2)
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  return bytes;
}

export const decode = (cells: Cell[]) =>
  decoder.decode(new Uint8Array(cells.map((cell) => cell.byte)));

/** One entry per character, with the bytes it expands to. */
export function codepoints(cells: Cell[]) {
  const out: { char: string; codepoint: string; bytes: string[] }[] = [];
  for (const cell of cells) {
    if (cell.lead)
      out.push({
        char: cell.char,
        codepoint:
          "U+" +
          (cell.char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0"),
        bytes: [],
      });
    out[out.length - 1]?.bytes.push(render(cell.byte, "hex"));
  }
  return out;
}
