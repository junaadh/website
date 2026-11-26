// Build-time renderers for the docs: card samples drawn with the real wasm and
// the sample profile, and the console's Tokens / AST / Bytecode views of a
// script. Server only. A script that does not run fails the build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderScript } from "@/lib/card/pipeline";
import { SAMPLE_USER } from "@/lib/card/sample";
import type { CardRuntime } from "@/lib/card/types";
import { type Eitri, loadCard, loadEitri } from "@/lib/eitri/eitri";

function wasmBytes(): ArrayBuffer {
  const bytes = readFileSync(join(process.cwd(), "public", "eitri", "eitri.wasm"));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

let card: Promise<CardRuntime> | null = null;
let site: Promise<Eitri> | null = null;

/** The SVG a card script draws for the bundled sample profile. */
export async function renderCardSvg(
  source: string,
  params: Record<string, string> = {},
): Promise<string> {
  card ??= loadCard(wasmBytes());
  const { svg, ok, result } = renderScript(await card, source, SAMPLE_USER, params);
  if (!ok) throw new Error(`docs: a card sample did not run (${result.outcome}): ${result.report}`);
  return svg;
}

/** The image a README shows for a card script that does not run. */
export async function renderCardFailure(source: string): Promise<string> {
  card ??= loadCard(wasmBytes());
  const { svg, ok } = renderScript(await card, source, SAMPLE_USER, {});
  if (ok) throw new Error("docs: expected a card script that fails");
  return svg;
}

export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** What the console's Tokens, AST and Bytecode tabs show for a script. */
export async function inspectScript(
  source: string,
  view: "tokens" | "ast" | "asm",
): Promise<string> {
  site ??= loadEitri(wasmBytes(), []);
  const out = (await site).inspect(source, view);
  if (!out.ok) throw new Error(`docs: could not inspect a sample: ${out.text}`);
  return out.text.trimEnd();
}
