"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ProjectData, RunResult } from "@/lib/eitri/eitri";
import { DEFAULT_SCRIPT } from "@/lib/eitri/examples";
import {
  buildEnv,
  clearSaved,
  decodeShare,
  getEitri,
  loadScript,
  readVisits,
  saveScript,
  writeVisits,
} from "@/lib/eitri/runtime";
import { applyEffects, DEFAULT_STATE, type SiteState } from "@/lib/eitri/site-state";
import { type Toast, ToastStack } from "./Toasts";
import { WeatherLayer } from "./WeatherLayer";

// The editor is only fetched when the console is first opened.
const Console = dynamic(() => import("./Console").then((m) => m.Console), { ssr: false });

export interface RunReport {
  outcome: RunResult["outcome"];
  report: string;
  prints: string[];
  toasts: string[];
  micros: number;
}

interface RunOptions {
  /** Persist the script if it runs cleanly. */
  save?: boolean;
  /** Replay: no toasts, no navigation. */
  silent?: boolean;
  visits?: number;
}

interface ConsoleApi {
  isOpen: boolean;
  openConsole: () => void;
  closeConsole: () => void;
  toggleConsole: () => void;
  script: string;
  setScript: (s: string) => void;
  run: (source: string, opts?: RunOptions) => Promise<RunReport>;
  running: boolean;
  last: RunReport | null;
  reset: () => void;
  notify: (text: string) => void;
  inspect: (
    source: string,
    view: "tokens" | "ast" | "asm",
  ) => Promise<{ ok: boolean; text: string }>;
}

const StateContext = createContext<SiteState>(DEFAULT_STATE);
const ConsoleContext = createContext<ConsoleApi | null>(null);

/** The visitor's current customisation (defaults until a script has run). */
export const useSiteState = () => useContext(StateContext);

export function useConsole(): ConsoleApi {
  const ctx = useContext(ConsoleContext);
  if (!ctx) throw new Error("useConsole must be used inside <SiteProvider>");
  return ctx;
}

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

// State -> DOM. Defaults remove the override so globals.css stays the source of truth.
function applyToDom(s: SiteState) {
  const root = document.documentElement;
  const set = (name: string, value: string, isDefault: boolean) =>
    isDefault ? root.style.removeProperty(name) : root.style.setProperty(name, value);
  set("--hue", String(s.hue), s.hue === DEFAULT_STATE.hue);
  set("--glow", String(s.glow), s.glow === DEFAULT_STATE.glow);
  set("--grid", `${s.grid || DEFAULT_STATE.grid}px`, s.grid === DEFAULT_STATE.grid || s.grid === 0);
  const flag = (name: string, on: boolean, attr: string) =>
    on ? root.setAttribute(name, attr) : root.removeAttribute(name);
  flag("data-grid", s.grid === 0, "off");
  flag("data-scanlines", !s.scanlines, "off");
  flag("data-mono", s.mono, "on");
}

let toastId = 0;

export function SiteProvider({
  projects,
  children,
}: {
  projects: ProjectData[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<SiteState>(DEFAULT_STATE);
  const [isOpen, setOpen] = useState(false);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<RunReport | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const slugs = useMemo(() => projects.map((p) => p.slug), [projects]);

  useEffect(() => applyToDom(state), [state]);

  const notify = useCallback((text: string) => {
    setToasts((t) => [...t.slice(-3), { id: ++toastId, text }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const run = useCallback(
    async (source: string, opts: RunOptions = {}): Promise<RunReport> => {
      setRunning(true);
      let res: RunResult;
      try {
        const eitri = await getEitri(projects);
        res = eitri.run(source, buildEnv(opts.visits ?? Math.max(readVisits(), 1)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res = { outcome: "error", report: `could not run: ${msg}`, effects: [], micros: 0 };
      }
      // Effects are always decoded for the output pane, but only a clean run
      // changes the page, so a half-typed script never flickers the look.
      const applied = applyEffects(res.effects, slugs);
      const report: RunReport = {
        outcome: res.outcome,
        report: res.report,
        prints: applied.prints,
        toasts: applied.toasts,
        micros: res.micros,
      };
      if (res.outcome === "ok") {
        setState(applied.state);
        if (opts.save) {
          saveScript(source);
          if (readVisits() === 0) writeVisits(1);
        }
        if (!opts.silent) {
          for (const t of applied.toasts) notify(t);
          if (applied.open) router.push(`/work/${applied.open}/`);
        }
      }
      setLast(report);
      setRunning(false);
      return report;
    },
    [projects, slugs, notify, router],
  );

  const reset = useCallback(() => {
    clearSaved();
    setState(DEFAULT_STATE);
    setScript(DEFAULT_SCRIPT);
    setLast(null);
    if (location.hash.startsWith("#eitri=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    notify("Page restored to defaults");
  }, [notify]);

  const inspect = useCallback(
    async (source: string, view: "tokens" | "ast" | "asm") =>
      (await getEitri(projects)).inspect(source, view),
    [projects],
  );

  // Boot: a shared #eitri= link wins over the saved script. Nothing touches
  // the wasm when there is neither.
  const booted = useRef(false);
  /* oxlint-disable react/set-state-in-effect -- one-time sync from URL/localStorage on mount */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const shared = decodeShare(location.hash);
    if (shared !== null) {
      setScript(shared);
      void run(shared, { save: false });
      return;
    }
    const saved = loadScript();
    if (saved) {
      setScript(saved);
      const visits = readVisits() + 1;
      writeVisits(visits);
      void run(saved, { silent: true, visits });
    }
  }, [run]);
  /* oxlint-enable react/set-state-in-effect */

  const toggleConsole = useCallback(() => setOpen((o) => !o), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "`" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const api = useMemo<ConsoleApi>(
    () => ({
      isOpen,
      openConsole: () => setOpen(true),
      closeConsole: () => setOpen(false),
      toggleConsole,
      script,
      setScript,
      run,
      running,
      last,
      reset,
      notify,
      inspect,
    }),
    [isOpen, toggleConsole, script, run, running, last, reset, notify, inspect],
  );

  return (
    <StateContext.Provider value={state}>
      <ConsoleContext.Provider value={api}>
        <WeatherLayer kind={state.weather} hue={state.hue} />
        {children}
        {isOpen && <Console />}
        <ToastStack toasts={toasts} dismiss={dismiss} lifted={isOpen} />
      </ConsoleContext.Provider>
    </StateContext.Provider>
  );
}
