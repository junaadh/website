// Eitri for the browser and node: a framework-free wrapper over the raw
// C-ABI exports of eitri.wasm (see crates/eitri-wasm/src/lib.rs). No imports.

export type Value = string | number | boolean;
export interface Effect {
  fn: string;
  args: Value[];
}
export interface Project {
  slug: string;
  tag: string;
}
export interface RunResult {
  outcome: "ok" | "compile" | "fault" | "error";
  report: string;
  effects: Effect[];
  micros: number;
}
export interface Eitri {
  run(source: string): RunResult;
  inspect(source: string, view: "tokens" | "ast" | "asm"): { ok: boolean; text: string };
}

interface Exports {
  memory: WebAssembly.Memory;
  eitri_alloc(len: number): number;
  eitri_dealloc(ptr: number, len: number): void;
  eitri_new(ptr: number, len: number): number;
  eitri_free(handle: number): void;
  eitri_run(handle: number, ptr: number, len: number): number;
  eitri_inspect(handle: number, ptr: number, len: number, view: number): number;
  eitri_out_ptr(handle: number): number;
}

const VIEWS = { tokens: 0, ast: 1, asm: 2 } as const;

const now: () => number =
  typeof performance !== "undefined" ? () => performance.now() : () => Date.now();

// Browser-only copy: the node file-path branch from the eitri repo is dropped.
async function fetchBytes(wasm: string | URL): Promise<ArrayBuffer> {
  const res = await fetch(wasm);
  if (!res.ok) throw new Error(`failed to load ${String(wasm)}: ${res.status}`);
  return res.arrayBuffer();
}

export async function loadEitri(
  wasm: string | URL | ArrayBuffer,
  projects: Project[],
): Promise<Eitri> {
  const bytes = wasm instanceof ArrayBuffer ? wasm : await fetchBytes(wasm);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const x = instance.exports as unknown as Exports;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Copy text into wasm memory, call f(ptr, len), release the buffer.
  const withText = <T>(text: string, f: (ptr: number, len: number) => T): T => {
    const data = encoder.encode(text);
    const ptr = x.eitri_alloc(data.length);
    try {
      new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
      return f(ptr, data.length);
    } finally {
      x.eitri_dealloc(ptr, data.length);
    }
  };

  // Memory may have grown during the call, so views are made after it.
  const readOutput = <T>(handle: number, len: number): T =>
    JSON.parse(decoder.decode(new Uint8Array(x.memory.buffer, x.eitri_out_ptr(handle), len)));

  const data = projects.map((p) => `${p.slug}\t${p.tag}\n`).join("");
  const handle = withText(data, (ptr, len) => x.eitri_new(ptr, len));

  return {
    run(source) {
      const start = now();
      const len = withText(source, (ptr, n) => x.eitri_run(handle, ptr, n));
      const micros = Math.round((now() - start) * 1000);
      const out = readOutput<Omit<RunResult, "micros">>(handle, len);
      return { outcome: out.outcome, report: out.report, effects: out.effects, micros };
    },
    inspect(source, view) {
      const len = withText(source, (ptr, n) => x.eitri_inspect(handle, ptr, n, VIEWS[view]));
      const out = readOutput<{ ok: boolean; text: string }>(handle, len);
      return { ok: out.ok, text: out.text };
    },
  };
}
