// The customisation model. A run describes the whole page, so applyEffects
// always starts from DEFAULT_STATE. Pure: no DOM, no React.

import type { Effect } from "./eitri";

export const WEATHERS = ["Clear", "Rain", "Storm", "Static", "Aurora"] as const;
export type Weather = (typeof WEATHERS)[number];

export interface SiteState {
  hue: number;
  weather: Weather;
  grid: number; // px, 0 hides the grid
  scanlines: boolean;
  glow: number; // 0-100
  mono: boolean;
  title: string | null;
  order: string[];
  hidden: string[];
  highlighted: string[];
}

export const DEFAULT_STATE: SiteState = {
  hue: 195,
  weather: "Clear",
  grid: 56,
  scanlines: true,
  glow: 45,
  mono: false,
  title: null,
  order: [],
  hidden: [],
  highlighted: [],
};

export interface Applied {
  state: SiteState;
  prints: string[];
  toasts: string[];
  open?: string;
}

export const TITLE_MAX = 24;
const OUTPUT_MAX = 500; // lines kept per run, so a loop can't flood the UI

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** knownSlugs: slugs of real projects; anything else is ignored. Omit to accept all. */
export function applyEffects(effects: readonly Effect[], knownSlugs?: Iterable<string>): Applied {
  const known = knownSlugs ? new Set(knownSlugs) : null;
  const valid = (v: unknown): v is string => typeof v === "string" && (!known || known.has(v));

  const state: SiteState = {
    ...DEFAULT_STATE,
    order: [],
    hidden: [],
    highlighted: [],
  };
  const prints: string[] = [];
  const toasts: string[] = [];
  let open: string | undefined;
  const addUnique = (list: string[], slug: string) => {
    if (!list.includes(slug)) list.push(slug);
  };

  for (const { fn, args } of effects) {
    const a = args[0];
    switch (fn) {
      case "hue": {
        const n = num(a);
        if (n !== null) state.hue = ((Math.round(n) % 360) + 360) % 360;
        break;
      }
      case "weather":
        if (typeof a === "string" && (WEATHERS as readonly string[]).includes(a)) {
          state.weather = a as Weather;
        }
        break;
      case "grid": {
        const n = num(a);
        if (n !== null) state.grid = n <= 0 ? 0 : clamp(Math.round(n), 16, 160);
        break;
      }
      case "scanlines":
        if (typeof a === "boolean") state.scanlines = a;
        break;
      case "glow": {
        const n = num(a);
        if (n !== null) state.glow = clamp(Math.round(n), 0, 100);
        break;
      }
      case "mono":
        if (typeof a === "boolean") state.mono = a;
        break;
      case "title":
        if (typeof a === "string") {
          const t = [...a.trim()].slice(0, TITLE_MAX).join("").trim();
          state.title = t === "" ? null : t;
        }
        break;
      case "order":
        if (Array.isArray(a)) {
          state.order = [];
          for (const s of a) if (valid(s)) addUnique(state.order, s);
        }
        break;
      case "hide":
        if (valid(a)) addUnique(state.hidden, a);
        break;
      case "highlight":
        if (valid(a)) addUnique(state.highlighted, a);
        break;
      case "open":
        if (valid(a)) open = a;
        break;
      case "print":
        if (typeof a === "string" && prints.length < OUTPUT_MAX) prints.push(a);
        break;
      case "toast":
        if (typeof a === "string" && toasts.length < OUTPUT_MAX) toasts.push(a);
        break;
    }
  }
  return { state, prints, toasts, open };
}
