// Eitri for the browser and node: a framework-free wrapper over the raw
// C-ABI exports of eitri.wasm (see crates/eitri-wasm/src/lib.rs). No imports.

export type Status = "active" | "shipped" | "experiment" | "archived";
export interface ProjectData {
  slug: string;
  name: string;
  kind: string;
  year: number;
  status: Status;
  featured: boolean;
  stack: string[];
}
export interface Env {
  hour: number;
  minute: number;
  second: number;
  weekday: number;
  visits: number;
}
export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export interface Effect {
  fn: string;
  args: Value[];
  callback?: number;
}
export interface RunResult {
  outcome: "ok" | "compile" | "fault" | "error" | "stale";
  report: string;
  effects: Effect[];
  micros: number;
}
export interface EventData {
  name: string;
  slug: string | null;
  section: string | null;
  key: string | null;
  x: number;
  y: number;
}
export type Payload =
  | { kind: "none" }
  | { kind: "event"; event: EventData }
  | { kind: "text"; value: string | null };
export interface Eitri {
  /** Run a script in a fresh context, replacing the previous program and dropping all its callbacks. */
  run(source: string, env: Env): RunResult;
  /** Call a retained callback with a fresh step budget; outcome "stale" if it no longer exists. */
  dispatch(callback: number, payload: Payload, env: Env): RunResult;
  /** Forget one callback (a timer that was cancelled, a prompt that was answered). */
  release(callback: number): void;
  inspect(source: string, view: "tokens" | "ast" | "asm"): { ok: boolean; text: string };
}

interface Exports {
  memory: WebAssembly.Memory;
  eitri_alloc(len: number): number;
  eitri_dealloc(ptr: number, len: number): void;
  eitri_new(ptr: number, len: number): number;
  eitri_free(handle: number): void;
  eitri_run(
    handle: number,
    ptr: number,
    len: number,
    hour: number,
    minute: number,
    second: number,
    weekday: number,
    visits: number,
  ): number;
  eitri_dispatch(
    handle: number,
    callback: number,
    kind: number,
    ptr: number,
    len: number,
    x: number,
    y: number,
    hour: number,
    minute: number,
    second: number,
    weekday: number,
    visits: number,
  ): number;
  eitri_release(handle: number, callback: number): void;
  eitri_inspect(handle: number, ptr: number, len: number, view: number): number;
  eitri_out_ptr(handle: number): number;
}

// Field separators on the wire. Control characters are spelled out with
// fromCharCode, and stripped from text with replaceAll, not a regex.
const US = String.fromCharCode(0x1f);
const NUL = String.fromCharCode(0);
const strip = (text: string, chars: string[]) => chars.reduce((t, c) => t.replaceAll(c, " "), text);

const VIEWS = { tokens: 0, ast: 1, asm: 2 } as const;

const now: () => number =
  typeof performance !== "undefined" ? () => performance.now() : () => Date.now();

// Browser-only copy of crates/eitri-wasm/js/eitri.ts: the node file-path
// branch is dropped so the bundle never references node:fs.
async function fetchBytes(wasm: string | URL): Promise<ArrayBuffer> {
  const res = await fetch(wasm);
  if (!res.ok) throw new Error(`failed to load ${String(wasm)}: ${res.status}`);
  return res.arrayBuffer();
}

export async function loadEitri(
  wasm: string | URL | ArrayBuffer,
  projects: ProjectData[],
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
  const readOutput = (handle: number, len: number): any =>
    JSON.parse(decoder.decode(new Uint8Array(x.memory.buffer, x.eitri_out_ptr(handle), len)));

  // One TAB-separated line per project; stack items joined by U+001F. The
  // separators are removed from field text so a line cannot be split.
  const clean = (text: string) => strip(text, ["\t", "\r", "\n", US]);
  const data = projects
    .map(
      (p) =>
        [
          clean(p.slug),
          clean(p.name),
          clean(p.kind),
          String(Math.trunc(p.year)),
          p.status,
          p.featured ? "1" : "0",
          p.stack.map(clean).join("\x1f"),
        ].join("\t") + "\n",
    )
    .join("");
  const handle = withText(data, (ptr, len) => x.eitri_new(ptr, len));

  const int = (n: number) => (Number.isFinite(n) ? Math.trunc(n) | 0 : 0);
  const num = (n: number) => (Number.isFinite(n) ? n : 0);
  const finish = (len: number, start: number): RunResult => {
    const micros = Math.round((now() - start) * 1000);
    const out = readOutput(handle, len);
    return { outcome: out.outcome, report: out.report, effects: out.effects, micros };
  };
  // Event fields are joined by U+001F; U+0000 marks null.
  const field = (text: string | null) => (text === null ? "\0" : strip(text, [NUL, US]));

  return {
    run(source, env) {
      const start = now();
      const len = withText(source, (ptr, n) =>
        x.eitri_run(
          handle,
          ptr,
          n,
          int(env.hour),
          int(env.minute),
          int(env.second),
          int(env.weekday),
          int(env.visits),
        ),
      );
      return finish(len, start);
    },
    dispatch(callback, payload, env) {
      const start = now();
      let kind = 0;
      let text = "";
      let px = 0;
      let py = 0;
      if (payload.kind === "event") {
        const e = payload.event;
        kind = 1;
        text = [field(e.name), field(e.slug), field(e.section), field(e.key)].join("\x1f");
        px = num(e.x);
        py = num(e.y);
      } else if (payload.kind === "text") {
        kind = payload.value === null ? 2 : 3;
        text = payload.value ?? "";
      }
      const len = withText(text, (ptr, n) =>
        x.eitri_dispatch(
          handle,
          callback >>> 0,
          kind,
          ptr,
          n,
          px,
          py,
          int(env.hour),
          int(env.minute),
          int(env.second),
          int(env.weekday),
          int(env.visits),
        ),
      );
      return finish(len, start);
    },
    release(callback) {
      x.eitri_release(handle, callback >>> 0);
    },
    inspect(source, view) {
      const len = withText(source, (ptr, n) => x.eitri_inspect(handle, ptr, n, VIEWS[view]));
      const out = readOutput(handle, len);
      return { ok: out.ok, text: out.text };
    },
  };
}
