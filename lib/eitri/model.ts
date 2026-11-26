// The customisation model: plain data, limits and defaults. No DOM, no React.
//
// Three layers (see engine.ts): the look and the content are described by a
// script's top level and reset on every run; the registry (actions, handlers,
// bindings, modes, timers, prompts) is what keeps a program alive afterwards.

export const WEATHERS = ["Clear", "Rain", "Storm", "Snow", "Static", "Aurora", "Matrix"] as const;
export type Weather = (typeof WEATHERS)[number];

export const CURSORS = ["Default", "Crosshair", "Ring", "Trail"] as const;
export type CursorKind = (typeof CURSORS)[number];

export interface Look {
  hue: number; // 0-359
  weather: Weather;
  grid: number; // px, 0 hides the grid
  scanlines: boolean;
  glow: number; // 0-100
  mono: boolean;
  crt: boolean;
  flicker: boolean;
  invert: boolean;
  cursor: CursorKind;
  scale: number; // percent, 80-130
}

export const DEFAULT_LOOK: Look = {
  hue: 195,
  weather: "Clear",
  grid: 56,
  scanlines: true,
  glow: 45,
  mono: false,
  crt: false,
  flicker: false,
  invert: false,
  cursor: "Default",
  scale: 100,
};

export interface Readout {
  label: string;
  value: string;
}

export interface Content {
  title: string | null;
  order: string[];
  hidden: string[];
  highlighted: string[];
  badges: Record<string, string[]>; // slug -> tags
  readouts: Readout[];
  banner: string; // "" means none
}

export const DEFAULT_CONTENT: Content = {
  title: null,
  order: [],
  hidden: [],
  highlighted: [],
  badges: {},
  readouts: [],
  banner: "",
};

export type Tone = "info" | "ok" | "warn" | "error";

export const SECTIONS = ["top", "work", "log", "systems", "contact"] as const;
export type SectionName = (typeof SECTIONS)[number];

export const EVENT_NAMES = [
  "project.hover",
  "project.leave",
  "project.click",
  "section",
  "key",
  "idle",
  "active",
  "visible",
  "hidden",
  "konami",
] as const;

/** Every cap in one place, so the contract's limits are easy to audit. */
export const LIMITS = {
  actions: 64,
  bindings: 128,
  timers: 20,
  readouts: 8,
  badgesPerCard: 3,
  handlersPerEvent: 16,
  log: 500, // lines kept
  title: 24,
  badge: 12,
  readoutLabel: 16,
  readoutValue: 40,
  toast: 160,
  banner: 200,
  typeout: 120,
  actionName: 32,
  actionTitle: 48,
  actionDescription: 120,
  category: 24,
  keywords: 8,
  keyword: 24,
  promptTitle: 60,
  promptField: 80,
  promptItems: 200,
  afterMin: 100,
  everyMin: 250,
  timerMax: 24 * 3600 * 1000,
  idleMs: 30_000,
  sequenceMs: 1000,
  hoverGap: 100, // ms between project.hover events per slug (10/s)
  effectsPerBatch: 400,
  oneShotsPerBatch: 24,
} as const;

export interface ScriptAction {
  name: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  callback: number;
}

/** What the palette needs to list an action. */
export interface ActionInfo {
  name: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  builtin: boolean;
}

export interface BindingInfo {
  key: string; // as normalised, e.g. "nav/shift+g" or "g>w"
  action: string;
}

export interface PickItem {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
}

export interface Prompt {
  id: number;
  kind: "pick" | "input";
  title: string;
  placeholder: string;
  items: PickItem[];
  value: string;
  confirm: string;
  callback: number;
}

export interface LogLine {
  id: number;
  kind: "print" | "toast" | "error";
  text: string;
  tone?: Tone;
}

export interface RunReport {
  outcome: "ok" | "compile" | "fault" | "error" | "stale";
  report: string;
  micros: number;
}

export type FxCommand =
  | { kind: "glitch"; ms: number }
  | { kind: "shake"; strength: number }
  | { kind: "flash" }
  | { kind: "sparks"; slug: string }
  | { kind: "scan" };

export type Command = { t: "toast"; text: string; tone: Tone } | { t: "fx"; fx: FxCommand };

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Trimmed, control characters removed, cut to max characters. */
export function text(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const clean = [...v].map((ch) => (ch < " " || ch === "\x7f" ? " " : ch)).join("");
  return [...clean.trim()].slice(0, max).join("").trim();
}
