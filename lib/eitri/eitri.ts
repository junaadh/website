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
  /** Bytes of wasm linear memory in use (it only grows). */
  memoryBytes(): number;
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

interface CardExports {
  memory: WebAssembly.Memory;
  eitri_alloc(len: number): number;
  eitri_dealloc(ptr: number, len: number): void;
  eitri_card_new(): number;
  eitri_card_free(handle: number): void;
  eitri_card_render(
    handle: number,
    src: number,
    srcLen: number,
    user: number,
    userLen: number,
    params: number,
    paramsLen: number,
  ): number;
  eitri_card_inspect(handle: number, ptr: number, len: number, view: number): number;
  eitri_card_out_ptr(handle: number): number;
}

export interface CardLanguage {
  name: string;
  color: string;
  share: number;
}
export interface CardRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
}
export interface CardUser {
  login: string;
  name: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  repos: number;
  stars: number;
  forks: number;
  commits: number;
  pullRequests: number;
  issues: number;
  contributedTo: number;
  joined: number;
  contributions: number;
  days: number[];
  languages: CardLanguage[];
  top: CardRepo[];
  /** A data: URL ("" if none). Not passed to the script; the renderer uses it for card.avatar. */
  avatar: string;
}
export interface CardRuntime {
  /** Fresh context per render: no callbacks, no state between renders. Same RunResult as run(). */
  render(source: string, user: CardUser, params: Record<string, string>): RunResult;
  inspect(source: string, view: "tokens" | "ast" | "asm"): { ok: boolean; text: string };
  /** Bytes of wasm linear memory in use (it only grows). */
  memoryBytes(): number;
}

/** Where the wasm comes from: a URL or path, its bytes, or a precompiled module
 *  (Cloudflare Workers cannot compile wasm from bytes at runtime). */
export type WasmSource = string | URL | ArrayBuffer | WebAssembly.Module;

// Field separators on the wire. Control characters are spelled out with
// fromCharCode, and stripped from text with replaceAll, not a regex.
const US = String.fromCharCode(0x1f);
const NUL = String.fromCharCode(0);
const strip = (text: string, chars: string[]) => chars.reduce((t, c) => t.replaceAll(c, " "), text);

const VIEWS = { tokens: 0, ast: 1, asm: 2 } as const;

const now: () => number =
  typeof performance !== "undefined" ? () => performance.now() : () => Date.now();

// Browser and Worker copy of crates/eitri-wasm/js/eitri.ts: the node
// file-path branch is dropped so bundles never reference node:fs.
async function fetchBytes(wasm: string | URL): Promise<ArrayBuffer> {
  const res = await fetch(wasm);
  if (!res.ok) throw new Error(`failed to load ${String(wasm)}: ${res.status}`);
  return res.arrayBuffer();
}

async function instantiate<E extends { memory: WebAssembly.Memory }>(wasm: WasmSource): Promise<E> {
  if (typeof WebAssembly.Module === "function" && wasm instanceof WebAssembly.Module) {
    // Instantiating a Module resolves to the Instance itself.
    const instance = await WebAssembly.instantiate(wasm, {});
    return instance.exports as unknown as E;
  }
  const bytes = wasm instanceof ArrayBuffer ? wasm : await fetchBytes(wasm as string | URL);
  // Typed loosely: the DOM and Workers typings disagree on what this resolves to.
  const result = (await WebAssembly.instantiate(bytes as ArrayBuffer, {})) as unknown as
    | WebAssembly.Instance
    | { instance: WebAssembly.Instance };
  const instance = "instance" in result ? result.instance : result;
  return instance.exports as unknown as E;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The buffer helpers every handle uses. */
function bridge(x: {
  memory: WebAssembly.Memory;
  eitri_alloc(len: number): number;
  eitri_dealloc(ptr: number, len: number): void;
}) {
  // Copy text into wasm memory, call f(ptr, len), release the buffer.
  const withText = <T>(text: string, f: (ptr: number, len: number) => T): T => {
    const data = encoder.encode(text);
    // Unsigned: an address above 2 GiB would read back negative. Zero is the
    // allocator saying no (too large, or out of memory).
    const ptr = x.eitri_alloc(data.length) >>> 0;
    if (ptr === 0) throw new Error("eitri: input too large or out of memory");
    try {
      new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
      return f(ptr, data.length);
    } finally {
      x.eitri_dealloc(ptr, data.length);
    }
  };
  // Memory may have grown during the call, so views are made after it.
  // An empty output is not JSON: it is null here and callers decide.
  const readAt = (ptr: number, len: number): any => {
    ptr >>>= 0;
    len >>>= 0;
    if (len === 0) return null;
    return JSON.parse(decoder.decode(new Uint8Array(x.memory.buffer, ptr, len)));
  };
  return { withText, readAt };
}

export async function loadEitri(wasm: WasmSource, projects: ProjectData[]): Promise<Eitri> {
  const x = await instantiate<Exports>(wasm);
  const { withText, readAt } = bridge(x);
  const readOutput = (handle: number, len: number): any => readAt(x.eitri_out_ptr(handle), len);

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
  const handle = withText(data, (ptr, len) => x.eitri_new(ptr, len)) >>> 0;

  const int = (n: number) => (Number.isFinite(n) ? Math.trunc(n) | 0 : 0);
  const num = (n: number) => (Number.isFinite(n) ? n : 0);
  const finish = (len: number, start: number): RunResult => {
    len >>>= 0;
    const micros = Math.round((now() - start) * 1000);
    const out = readOutput(handle, len);
    if (out === null)
      return { outcome: "error", report: "eitri: empty result", effects: [], micros };
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
      if (!(view in VIEWS)) return { ok: false, text: "eitri: unknown view" };
      const len = withText(source, (ptr, n) => x.eitri_inspect(handle, ptr, n, VIEWS[view])) >>> 0;
      const out = len === 0 ? null : readOutput(handle, len);
      if (out === null) return { ok: false, text: "eitri: no output" };
      return { ok: out.ok, text: out.text };
    },
    memoryBytes: () => x.memory.buffer.byteLength,
  };
}

// ---- Cards ------------------------------------------------------------------

// The wire format (see crates/eitri-wasm/src/lib.rs): TAB-separated lines.
const wireText = (text: string) => String(text ?? "").replace(/[\t\r\n]/g, " ");
const wireInt = (n: number) => (Number.isFinite(n) ? String(Math.trunc(n)) : "0");
const wireShare = (n: number) => (Number.isFinite(n) ? String(Math.min(1, Math.max(0, n))) : "0");

function encodeUser(u: CardUser): string {
  const lines = [
    [
      "U",
      wireText(u.login),
      wireText(u.name),
      wireText(u.bio),
      wireText(u.location),
      wireInt(u.followers),
      wireInt(u.following),
      wireInt(u.repos),
      wireInt(u.stars),
      wireInt(u.forks),
      wireInt(u.commits),
      wireInt(u.pullRequests),
      wireInt(u.issues),
      wireInt(u.contributedTo),
      wireInt(u.joined),
      wireInt(u.contributions),
    ].join("\t"),
    "D\t" + (u.days ?? []).slice(0, 371).map(wireInt).join(","),
  ];
  for (const l of (u.languages ?? []).slice(0, 8)) {
    lines.push(["L", wireText(l.name), wireText(l.color), wireShare(l.share)].join("\t"));
  }
  for (const r of (u.top ?? []).slice(0, 6)) {
    lines.push(
      [
        "R",
        wireText(r.name),
        wireText(r.description),
        wireText(r.language),
        wireInt(r.stars),
        wireInt(r.forks),
      ].join("\t"),
    );
  }
  return lines.join("\n") + "\n";
}

function encodeParams(params: Record<string, string>): string {
  return Object.entries(params ?? {})
    .map(([name, value]) => wireText(name) + "\t" + wireText(value) + "\n")
    .join("");
}

/** Load the card renderer: drawing scripts for SVG cards from GitHub profile data. */
export async function loadCard(wasm: WasmSource): Promise<CardRuntime> {
  const x = await instantiate<CardExports>(wasm);
  const { withText, readAt } = bridge(x);
  const handle = x.eitri_card_new() >>> 0;
  const readOutput = (len: number): any => readAt(x.eitri_card_out_ptr(handle), len);

  return {
    render(source, user, params) {
      const start = now();
      const len = withText(source, (sp, sn) =>
        withText(encodeUser(user), (up, un) =>
          withText(encodeParams(params), (pp, pn) =>
            x.eitri_card_render(handle, sp, sn, up, un, pp, pn),
          ),
        ),
      );
      const micros = Math.round((now() - start) * 1000);
      const out = readOutput(len);
      if (out === null)
        return { outcome: "error", report: "eitri: empty result", effects: [], micros };
      return { outcome: out.outcome, report: out.report, effects: out.effects, micros };
    },
    memoryBytes: () => x.memory.buffer.byteLength,
    inspect(source, view) {
      if (!(view in VIEWS)) return { ok: false, text: "eitri: unknown view" };
      const len =
        withText(source, (ptr, n) => x.eitri_card_inspect(handle, ptr, n, VIEWS[view])) >>> 0;
      const out = len === 0 ? null : readOutput(len);
      if (out === null) return { ok: false, text: "eitri: no output" };
      return { ok: out.ok, text: out.text };
    },
  };
}
