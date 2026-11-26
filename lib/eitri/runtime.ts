// Browser glue for the console: lazy wasm, run environment, persistence, sharing.

import { type Eitri, type Env, loadEitri, type ProjectData } from "./eitri";

export const SCRIPT_KEY = "eitri.script";
export const MUTE_KEY = "eitri.mute";
export const VISITS_KEY = "eitri.visits";
const WASM_URL = "/eitri/eitri.wasm";

let loading: Promise<Eitri> | null = null;

/** The wasm is fetched on first call only; later calls share the instance. */
export function getEitri(projects: ProjectData[]): Promise<Eitri> {
  if (!loading) {
    loading = loadEitri(WASM_URL, projects).catch((err) => {
      loading = null; // allow a retry
      throw err;
    });
  }
  return loading;
}

/** Forget the instance after a wasm trap: the next getEitri() instantiates a fresh one. */
export function dropEitri(): void {
  loading = null;
}

const maldives = new Intl.DateTimeFormat("en-US", {
  timeZone: "Indian/Maldives",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildEnv(visits: number, at: Date = new Date()): Env {
  const parts = Object.fromEntries(maldives.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: Math.max(0, WEEKDAYS.indexOf(parts.weekday ?? "")),
    visits,
  };
}

// localStorage can throw (privacy modes, quota): persistence is best-effort.
const safe = <T>(f: () => T, fallback: T): T => {
  try {
    return f();
  } catch {
    return fallback;
  }
};

export const loadScript = () => safe(() => localStorage.getItem(SCRIPT_KEY), null);
export const saveScript = (s: string) => safe(() => localStorage.setItem(SCRIPT_KEY, s), undefined);
export const readVisits = () =>
  safe(() => {
    const n = Number.parseInt(localStorage.getItem(VISITS_KEY) ?? "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, 0);
export const writeVisits = (n: number) =>
  safe(() => localStorage.setItem(VISITS_KEY, String(n)), undefined);
export const loadMuted = () => safe(() => localStorage.getItem(MUTE_KEY) === "1", false);
export const saveMuted = (on: boolean) =>
  safe(() => localStorage.setItem(MUTE_KEY, on ? "1" : "0"), undefined);
export const clearSaved = () =>
  safe(() => {
    localStorage.removeItem(SCRIPT_KEY);
  }, undefined);

// base64url of the UTF-8 script, for #eitri=<...> links.
export function encodeShare(script: string): string {
  const bytes = new TextEncoder().encode(script);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeShare(hash: string): string | null {
  const m = /^#eitri=([A-Za-z0-9_-]*)$/.exec(hash);
  if (!m || m[1] === undefined) return null;
  try {
    const b64 = m[1].replaceAll("-", "+").replaceAll("_", "/");
    const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(bin, (c) => c.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}
