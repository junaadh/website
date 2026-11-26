// The site wasm draws diagnostics with Unicode box characters and ANSI SGR
// colours (the same report the eitri CLI prints). These turn that text into
// styled runs for the console and docs, or into plain text for one-line uses.

const ESC = String.fromCharCode(27);

/** `at` is the run's offset in the text with escapes removed. */
export type AnsiRun = { at: number; text: string; cls: string };

/** HUD classes for the SGR codes eitri-diag emits. */
function classFor(codes: string[]): string {
  const bold = codes.includes("1");
  const color = codes.find((c) => c.length === 2 && c.startsWith("3"));
  const hue =
    color === "31"
      ? "text-err"
      : color === "33"
        ? "text-warn"
        : color === "35"
          ? "text-fault"
          : color === "34"
            ? "text-signal/80"
            : bold
              ? "text-ink"
              : "";
  return bold ? `${hue} font-semibold`.trim() : hue;
}

/** Split text at SGR sequences (ESC [ … m); other escapes are dropped. */
export function parseAnsi(text: string): AnsiRun[] {
  const runs: AnsiRun[] = [];
  let cls = "";
  let i = 0;
  let from = 0;
  let out = 0;
  const flush = (to: number) => {
    if (to <= from) return;
    const piece = text.slice(from, to);
    const last = runs.at(-1);
    if (last && last.cls === cls) last.text += piece;
    else runs.push({ at: out, text: piece, cls });
    out += piece.length;
  };
  while (i < text.length) {
    if (text[i] === ESC && text[i + 1] === "[") {
      flush(i);
      let j = i + 2;
      while (j < text.length && !/[@-~]/.test(text[j] ?? "")) j++;
      const params = text.slice(i + 2, j);
      if (text[j] === "m") {
        const codes = params === "" ? ["0"] : params.split(";");
        cls = codes.includes("0") ? "" : classFor(codes);
      }
      i = j + 1;
      from = i;
    } else i++;
  }
  flush(text.length);
  return runs;
}

export const stripAnsi = (text: string) =>
  parseAnsi(text)
    .map((r) => r.text)
    .join("");
