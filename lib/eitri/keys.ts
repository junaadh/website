// Rex-style key strings. Pure functions: parsing, normalising, and resolving a
// key press against bindings, sequences and modes.
//
//   "shift+g"  "ctrl+k"  "?"      a key with modifiers
//   "g>w"                          a sequence (1 s between keys)
//   "nav/j"                        a key that only works in mode "nav"

const MOD_ORDER = ["ctrl", "alt", "shift", "meta"] as const;
const MOD_ALIAS: Record<string, string> = {
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  super: "meta",
};
const KEY_ALIAS: Record<string, string> = {
  esc: "escape",
  return: "enter",
  " ": "space",
  spacebar: "space",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  del: "delete",
  plus: "+",
};
const MODIFIER_KEYS = new Set(["control", "shift", "alt", "meta", "altgraph", "capslock", "os"]);

/**
 * Keys the page keeps for itself: they cannot be bound. Every ctrl/alt/meta
 * chord is reserved (browser and OS shortcuts, the palette), and so are the
 * keys that operate controls and leave dialogs. Scripts may bind plain keys,
 * shift+keys and sequences of those.
 */
export const RESERVED_NAMES = new Set(["enter", "space", "tab", "escape", "`"]);
const FUNCTION_KEY = /^f([1-9]|1[0-2])$/;

/** Is one canonical step ("ctrl+k", "f5", "tab") reserved? */
export function isReservedStep(step: string): boolean {
  const parts = splitPlus(step);
  const key = parts[parts.length - 1] ?? "";
  if (parts.some((p) => p === "ctrl" || p === "alt" || p === "meta")) return true;
  return RESERVED_NAMES.has(key) || FUNCTION_KEY.test(key);
}

const MODE_NAME = /^[a-z][a-z0-9_]{0,15}$/;

export interface Parsed {
  mode: string | null;
  steps: string[];
  /** Canonical text: the same binding written two ways compares equal. */
  canon: string;
}

// "ctrl+k" -> ["ctrl", "k"]; a trailing "+" is the plus key ("ctrl++").
function splitPlus(step: string): string[] {
  if (step === "+") return ["+"];
  if (step.endsWith("++")) return [...step.slice(0, -2).split("+"), "+"];
  return step.split("+");
}

function parseStep(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s === "") return null;
  const parts = splitPlus(s);
  const key0 = parts.pop();
  if (key0 === undefined || key0 === "") return null;
  const key = KEY_ALIAS[key0] ?? key0;
  if (MODIFIER_KEYS.has(key)) return null;
  const mods = new Set<string>();
  for (const p of parts) {
    const m = MOD_ALIAS[p.trim()];
    if (!m) return null;
    mods.add(m);
  }
  const single = [...key].length === 1;
  if (!single && !/^[a-z][a-z0-9]*$/.test(key)) return null; // named keys only
  // Shift is implied by symbols ("?"), so it is dropped there.
  if (single && !/[a-z0-9]/.test(key)) mods.delete("shift");
  return [...MOD_ORDER.filter((m) => mods.has(m)), key].join("+");
}

export function parseBinding(input: string, allowReserved = false): Parsed | null {
  if (typeof input !== "string" || input.length > 64) return null;
  let rest = input.trim();
  let mode: string | null = null;
  const slash = rest.indexOf("/");
  if (slash > 0) {
    const head = rest.slice(0, slash).toLowerCase();
    if (MODE_NAME.test(head) && rest.length > slash + 1) {
      mode = head;
      rest = rest.slice(slash + 1);
    }
  }
  const raw = rest.length <= 1 ? [rest] : rest.split(">");
  if (raw.length > 4) return null;
  const steps: string[] = [];
  for (const r of raw) {
    const step = parseStep(r);
    if (step === null) return null;
    steps.push(step);
  }
  if (!allowReserved && steps.some(isReservedStep)) return null;
  const canon = (mode ? `${mode}/` : "") + steps.join(">");
  return { mode, steps, canon };
}

export function isModeName(name: string): boolean {
  return MODE_NAME.test(name);
}

interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** The canonical step for a keyboard event, or null for a bare modifier. */
export function normalizeEvent(e: KeyLike): string | null {
  const k = e.key;
  if (!k || MODIFIER_KEYS.has(k.toLowerCase()) || k === "Dead" || k === "Unidentified") return null;
  const lower = k.toLowerCase();
  const key = KEY_ALIAS[lower] ?? lower;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("ctrl");
  if (e.altKey) mods.push("alt");
  const symbol = [...key].length === 1 && !/[a-z0-9]/.test(key);
  if (e.shiftKey && !symbol) mods.push("shift");
  if (e.metaKey) mods.push("meta");
  return [...mods, key].join("+");
}

const GLYPH: Record<string, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Cmd",
  escape: "Esc",
  enter: "Enter",
  space: "Space",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  tab: "Tab",
  backspace: "Bksp",
};

/** "nav/shift+g" -> one array of key caps per step: [["NAV", "Shift", "G"]]. */
export function prettyKey(canon: string): string[][] {
  const slash = canon.indexOf("/");
  const hasMode = slash > 0 && MODE_NAME.test(canon.slice(0, slash));
  const body = hasMode ? canon.slice(slash + 1) : canon;
  const steps = (body.length <= 1 ? [body] : body.split(">")).map((step) =>
    splitPlus(step).map((p) => GLYPH[p] ?? (p.length === 1 ? p.toUpperCase() : p)),
  );
  if (hasMode) steps[0]?.unshift(canon.slice(0, slash).toUpperCase());
  return steps;
}

export interface Bound extends Parsed {
  action: string;
}

export interface KeyState {
  mode: string | null;
  pending: string[];
}

export type KeyResult =
  | { type: "run"; action: string; pending: string[] }
  | { type: "pending"; pending: string[] }
  | { type: "exit"; pending: string[] }
  | { type: "cancel"; pending: string[] }
  | { type: "none"; swallow: boolean; pending: string[] };

const startsWith = (steps: string[], seq: string[]) => seq.every((s, i) => steps[i] === s);

/**
 * Resolve one key press. Escape cancels a pending sequence, then leaves the
 * current mode. In a mode, its own bindings come first, then the global ones;
 * an exclusive mode ignores the global ones and swallows keys nobody bound.
 */
export function resolveKey(
  bindings: Iterable<Bound>,
  state: KeyState,
  exclusive: boolean,
  key: string,
): KeyResult {
  if (key === "escape") {
    if (state.pending.length > 0) return { type: "cancel", pending: [] };
    if (state.mode) return { type: "exit", pending: [] };
  }
  const scope = [...bindings].filter((b) =>
    state.mode ? b.mode === state.mode || (!exclusive && b.mode === null) : b.mode === null,
  );
  const attempt = (seq: string[]): KeyResult | null => {
    const exact = scope.find((b) => b.steps.length === seq.length && startsWith(b.steps, seq));
    if (exact) return { type: "run", action: exact.action, pending: [] };
    if (scope.some((b) => b.steps.length > seq.length && startsWith(b.steps, seq))) {
      return { type: "pending", pending: seq };
    }
    return null;
  };
  const hit = attempt([...state.pending, key]) ?? (state.pending.length ? attempt([key]) : null);
  if (hit) return hit;
  return { type: "none", swallow: Boolean(state.mode && exclusive), pending: [] };
}

/** up up down down left right left right b a */
export const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];
