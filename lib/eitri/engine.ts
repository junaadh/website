// The runtime engine: runs scripts, keeps their registry alive, applies the
// effects they record, and turns page events into handler calls.
//
// Framework-free. React subscribes through useEngine (components/console/
// SiteProvider.tsx); one-shot effects (toasts, fx) reach the UI as commands.
//
// Rules the code below keeps:
//  - run() resets look + content and replaces the registry; dispatch results
//    apply on top of the current state.
//  - apply() never calls into the wasm: anything that would (an invoked action,
//    a dismissed prompt) is deferred until the batch is committed. That keeps
//    nested calls from clobbering each other's state.
//  - every untrusted value is validated and clamped before it is used.

import { stripAnsi } from "./ansi";
import { builtinActions } from "./builtins";
import type { Effect, Eitri, EventData, Payload, ProjectData, RunResult, Value } from "./eitri";
import { DEFAULT_SCRIPT } from "./examples";
import { type Bound, isModeName, type KeyState, parseBinding, resolveKey } from "./keys";
import {
  type ActionInfo,
  type BindingInfo,
  type Command,
  type Content,
  CURSORS,
  clamp,
  DEFAULT_CONTENT,
  DEFAULT_LOOK,
  EVENT_NAMES,
  type FxCommand,
  LIMITS,
  type LogLine,
  type Look,
  num,
  type PickItem,
  type Prompt,
  type RunReport,
  type ScriptAction,
  SECTIONS,
  type Tone,
  text,
  WEATHERS,
} from "./model";
import {
  buildEnv,
  clearSaved,
  decodeShare,
  dropEitri,
  getEitri,
  loadMuted,
  loadScript,
  readVisits,
  saveMuted,
  saveScript,
  writeVisits,
} from "./runtime";
import * as sound from "./sound";

export interface EngineState {
  look: Look;
  content: Content;
  /** Script actions only; built-ins come from engine.builtins. */
  actions: ActionInfo[];
  bindings: BindingInfo[];
  mode: string | null;
  prompt: Prompt | null;
  consoleOpen: boolean;
  paletteOpen: boolean;
  typeout: { text: string; nonce: number } | null;
  decode: number; // bumps to replay heading decoding
  userMuted: boolean;
  scriptMuted: boolean;
  running: boolean;
  last: RunReport | null;
  log: LogLine[];
  script: string;
  /** A script that arrived in a #eitri= link: loaded into the editor, not run. */
  sharedPending: boolean;
}

export interface EngineHost {
  navigate(href: string): void;
}

type Listener = () => void;
type CommandListener = (c: Command) => void;

interface Timer {
  id: number;
  kind: "after" | "every";
  ms: number;
  handle: ReturnType<typeof setTimeout> | null;
}

export interface RunOptions {
  /** Persist the script if it runs cleanly. */
  save?: boolean;
  /** Replay: no toasts, sounds, fx, prompts or navigation. */
  silent?: boolean;
  visits?: number;
}

const MAX_DEPTH = 3;
/** A prompt or palette that no one asked for waits this long after the last one. */
const PROMPT_COOLDOWN_MS = 5000;
/** Look flips (invert, flicker) and flashes share this budget: at most 2 per second. */
const STROBE_MAX = 2;
const STROBE_WINDOW_MS = 1000;
/** Query parameter that boots the page without the saved script. */
const SAFE_PARAM = "safe";
const TONES: Record<string, Tone> = { info: "info", ok: "ok", warn: "warn", error: "error" };

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Engine {
  readonly projects: ProjectData[];
  readonly slugs: Set<string>;
  readonly builtins = new Map<string, { info: ActionInfo; run: () => void }>();
  private host: EngineHost = { navigate: () => {} };
  setHost(host: EngineHost): void {
    this.host = host;
  }
  /** Pointer position, 0-1 across the viewport; written by the page listeners. */
  pointer = { x: 0.5, y: 0.5 };

  private state: EngineState;
  private listeners = new Set<Listener>();
  private commandListeners = new Set<CommandListener>();

  private eitri: Eitri | null = null;
  private visits = 1;
  private depth = 0;
  private visible = true;
  private lineId = 0;
  private promptId = 0;
  private nonce = 0;
  private lastErrorToast = 0;

  // The live registry.
  private actions = new Map<string, ScriptAction>();
  private handlers = new Map<string, number[]>();
  private bindings = new Map<string, Bound>();
  private modes = new Map<string, boolean>(); // name -> exclusive
  private timers = new Map<number, Timer>();
  private keyState: KeyState = { mode: null, pending: [] };
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEmit = new Map<string, number>();
  /** Who is driving the code that is running: the visitor (a key, the palette, Run) or a timer/event. */
  private origin: "user" | "background" = "background";
  private lastPromptAt = -Infinity;
  private strobes: number[] = [];

  constructor(projects: ProjectData[]) {
    this.projects = projects;
    this.slugs = new Set(projects.map((p) => p.slug));
    for (const b of builtinActions(this)) this.builtins.set(b.info.name, b);
    this.state = {
      look: DEFAULT_LOOK,
      content: DEFAULT_CONTENT,
      actions: [],
      bindings: [],
      mode: null,
      prompt: null,
      consoleOpen: false,
      paletteOpen: false,
      typeout: null,
      decode: 0,
      userMuted: false,
      scriptMuted: false,
      running: false,
      last: null,
      log: [],
      script: DEFAULT_SCRIPT,
      sharedPending: false,
    };
  }

  // ── store ──────────────────────────────────────────────────────────────
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = (): EngineState => this.state;
  private set(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of [...this.listeners]) fn();
  }
  onCommand(fn: CommandListener): () => void {
    this.commandListeners.add(fn);
    return () => this.commandListeners.delete(fn);
  }
  private command(c: Command): void {
    for (const fn of [...this.commandListeners]) fn(c);
  }

  // ── simple UI state ────────────────────────────────────────────────────
  setScript = (script: string): void => this.set({ script });
  openConsole = (): void => this.set({ consoleOpen: true });
  closeConsole = (): void => this.set({ consoleOpen: false });
  toggleConsole = (): void => this.set({ consoleOpen: !this.state.consoleOpen });
  openPalette = (): void => this.set({ paletteOpen: true });
  /** Closes the palette; a prompt that is open is dismissed (answered null). */
  closePalette = (): void => {
    if (this.state.prompt) this.answerPrompt(null);
    this.set({ paletteOpen: false });
  };
  togglePalette = (): void => {
    if (this.state.paletteOpen || this.state.prompt) this.closePalette();
    else this.openPalette();
  };
  patchLook = (patch: Partial<Look>): void => this.set({ look: { ...this.state.look, ...patch } });
  toast = (textValue: string, tone: Tone = "info"): void =>
    this.command({ t: "toast", text: text(textValue, LIMITS.toast), tone });
  get muted(): boolean {
    return this.state.userMuted || this.state.scriptMuted;
  }
  setUserMuted = (on: boolean): void => {
    saveMuted(on);
    this.set({ userMuted: on });
  };
  loadPreferences = (): void => {
    this.set({ userMuted: loadMuted() });
  };

  // ── running ────────────────────────────────────────────────────────────
  async run(source: string, opts: RunOptions = {}): Promise<RunReport> {
    this.set({ running: true, sharedPending: false });
    const visits = opts.visits ?? Math.max(readVisits(), 1);
    let res: RunResult;
    try {
      this.eitri = await getEitri(this.projects);
      res = this.eitri.run(source, buildEnv(visits));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res = { outcome: "error", report: `could not run: ${msg}`, effects: [], micros: 0 };
      this.dropInstance();
    }
    const report: RunReport = { outcome: res.outcome, report: res.report, micros: res.micros };
    // Output is decoded for every run, but only a clean run changes the page,
    // so a half-typed script never flickers the look.
    const log = this.scanLog(res.effects, []);
    if (res.outcome === "ok") {
      this.visits = visits;
      this.resetProgram();
      this.set({ log });
      this.as(opts.silent ? "background" : "user", () =>
        this.apply(res.effects, { silent: Boolean(opts.silent) }),
      );
      if (opts.save) {
        saveScript(source);
        if (readVisits() === 0) writeVisits(1);
      }
    } else {
      this.set({ log });
    }
    this.set({ last: report, running: false });
    return report;
  }

  /** Back to the stock page: saved script cleared, program dropped. */
  reset = (): void => {
    clearSaved();
    this.resetProgram();
    try {
      this.eitri?.run("", buildEnv(this.visits));
    } catch {
      // the program is already gone from our side
    }
    this.set({ script: DEFAULT_SCRIPT, last: null, log: [], sharedPending: false });
    if (location.hash.startsWith("#eitri=")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    this.toast("Page restored to defaults");
  };

  /** Drop the wasm instance after a trap, with the registry that pointed into it. */
  private dropInstance(): void {
    dropEitri();
    this.eitri = null;
    for (const t of this.timers.values()) this.stopTimer(t);
    this.timers.clear();
    this.actions.clear();
    this.handlers.clear();
    this.bindings.clear();
    this.modes.clear();
    this.clearPending();
    this.keyState = { mode: null, pending: [] };
    this.set({ prompt: null });
    this.publishRegistry();
  }

  /** True when something is running or saved that a panic reset would clear. */
  get hasProgram(): boolean {
    return (
      this.state.prompt !== null ||
      this.timers.size > 0 ||
      this.actions.size > 0 ||
      this.handlers.size > 0 ||
      this.bindings.size > 0 ||
      loadScript() !== null
    );
  }

  /** Run fn with the given origin, restoring the previous one. */
  private as<T>(origin: "user" | "background", fn: () => T): T {
    const prev = this.origin;
    this.origin = origin;
    try {
      return fn();
    } finally {
      this.origin = prev;
    }
  }

  /** At most STROBE_MAX look flips or flashes per second, across all scripts. */
  private allowStrobe(): boolean {
    const now = performance.now();
    this.strobes = this.strobes.filter((t) => now - t < STROBE_WINDOW_MS);
    if (this.strobes.length >= STROBE_MAX) return false;
    this.strobes.push(now);
    return true;
  }

  /** A prompt or the palette that a script opens unasked is refused while one is open or cooling down. */
  private allowPrompt(): boolean {
    if (this.origin === "user") return true;
    if (this.state.prompt || this.state.paletteOpen) return false;
    return performance.now() - this.lastPromptAt >= PROMPT_COOLDOWN_MS;
  }

  inspect = async (source: string, view: "tokens" | "ast" | "asm") =>
    (await getEitri(this.projects)).inspect(source, view);

  /**
   * Called once on mount. ?safe skips and clears the saved script. A shared
   * #eitri= link is only loaded into the editor: it never runs until the
   * visitor presses Run. A script the visitor saved themselves may replay.
   */
  boot = (): void => {
    this.loadPreferences();
    const params = new URLSearchParams(location.search);
    if (params.has(SAFE_PARAM)) {
      clearSaved();
      params.delete(SAFE_PARAM);
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
      this.toast("Safe mode: saved script cleared, nothing was run", "warn");
      return;
    }
    const shared = decodeShare(location.hash);
    if (shared !== null) {
      this.set({ script: shared, sharedPending: true, consoleOpen: true });
      return;
    }
    const saved = loadScript();
    if (saved) {
      this.setScript(saved);
      const visits = readVisits() + 1;
      writeVisits(visits);
      void this.run(saved, { silent: true, visits });
    }
  };

  /** Drop everything a program owns and restore the default page. */
  private resetProgram(): void {
    this.lastPromptAt = -Infinity;
    this.strobes = [];
    for (const t of this.timers.values()) if (t.handle !== null) clearTimeout(t.handle);
    this.timers.clear();
    this.actions.clear();
    this.handlers.clear();
    this.bindings.clear();
    this.modes.clear();
    this.lastEmit.clear();
    this.clearPending();
    this.keyState = { mode: null, pending: [] };
    this.set({
      look: DEFAULT_LOOK,
      content: DEFAULT_CONTENT,
      prompt: null,
      typeout: null,
      scriptMuted: false,
    });
    this.publishRegistry();
  }

  private publishRegistry(): void {
    this.set({
      actions: [...this.actions.values()].map((a) => ({
        name: a.name,
        title: a.title,
        description: a.description,
        category: a.category || "Script",
        keywords: a.keywords,
        builtin: false,
      })),
      bindings: [...this.bindings.values()].map((b) => ({ key: b.canon, action: b.action })),
      mode: this.keyState.mode,
    });
  }

  // ── calling into the program ───────────────────────────────────────────
  private env() {
    return buildEnv(this.visits);
  }

  private logLine(kind: LogLine["kind"], textValue: string, tone?: Tone): LogLine {
    return { id: ++this.lineId, kind, text: textValue, tone };
  }

  /** print()/toast() calls of a batch as console lines (capped). */
  private scanLog(effects: readonly Effect[], into: LogLine[]): LogLine[] {
    const out = into.slice();
    for (const { fn, args } of effects) {
      if (out.length >= LIMITS.log) break;
      if (fn === "site.print" && typeof args[0] === "string") {
        out.push(this.logLine("print", args[0].slice(0, 500)));
      } else if (fn === "ui.toast" && typeof args[0] === "string") {
        const tone = TONES[String(args[1] ?? "info").toLowerCase()] ?? "info";
        out.push(this.logLine("toast", args[0].slice(0, LIMITS.toast), tone));
      }
    }
    return out.length > LIMITS.log ? out.slice(-LIMITS.log) : out;
  }

  /** Call a retained callback. Returns null when it could not be called. */
  private callback(id: number, payload: Payload): RunResult | null {
    const eitri = this.eitri;
    if (!eitri || this.depth >= MAX_DEPTH) return null;
    this.depth++;
    try {
      const res = eitri.dispatch(id, payload, this.env());
      if (res.outcome === "stale") {
        this.forget(id);
        return res;
      }
      if (res.effects.length) {
        this.set({ log: this.scanLog(res.effects, this.state.log) });
        this.apply(res.effects, { silent: false });
      }
      if (res.outcome !== "ok") this.fault(res);
      return res;
    } catch (err) {
      this.fault({
        outcome: "error",
        report: err instanceof Error ? err.message : String(err),
        effects: [],
        micros: 0,
      });
      // A trap leaves the wasm in an unknown state: drop it and the program that lived in it.
      this.dropInstance();
      return null;
    } finally {
      this.depth--;
    }
  }

  private fault(res: RunResult): void {
    const first =
      stripAnsi(res.report)
        .split("\n")
        .find((l) => l.trim() !== "") ?? res.outcome;
    this.set({
      log: [...this.state.log, this.logLine("error", res.report || first)].slice(-LIMITS.log),
    });
    const now = Date.now();
    if (now - this.lastErrorToast > 2000) {
      this.lastErrorToast = now;
      this.toast(`Script error: ${first.slice(0, 100)}`, "error");
    }
  }

  /** Drop every trace of a callback the wasm no longer knows. */
  private forget(id: number): void {
    const timer = this.timers.get(id);
    if (timer) this.stopTimer(timer);
    this.timers.delete(id);
    let changed = false;
    for (const [name, a] of this.actions) {
      if (a.callback === id) {
        this.actions.delete(name);
        changed = true;
      }
    }
    for (const [event, list] of this.handlers) {
      const rest = list.filter((c) => c !== id);
      if (rest.length !== list.length) this.handlers.set(event, rest);
    }
    if (this.state.prompt?.callback === id) this.set({ prompt: null });
    if (changed) this.publishRegistry();
  }

  private release(id: number): void {
    try {
      this.eitri?.release(id);
    } catch {
      // nothing to release
    }
  }

  // ── actions ────────────────────────────────────────────────────────────
  /** Run an action by name: a built-in or one a script registered. */
  invoke = (name: string): void => this.as("user", () => this.invokeNow(name));

  private invokeNow(name: string): void {
    const builtin = this.builtins.get(name);
    if (builtin) {
      builtin.run();
      return;
    }
    const action = this.actions.get(name);
    if (!action) {
      this.toast(`No action called ${text(name, 40)}`, "warn");
      return;
    }
    this.callback(action.callback, { kind: "none" });
  }

  // ── events ─────────────────────────────────────────────────────────────
  hasHandlers(name: string): boolean {
    return (this.handlers.get(name)?.length ?? 0) > 0;
  }

  /** Deliver a page event to the handlers of a script. */
  emit(name: string, fields: Partial<EventData> = {}): void {
    const list = this.handlers.get(name);
    if (!list || list.length === 0) return;
    // Noisy events are rate-limited: hover per slug (10/s), the rest 20/s.
    const gap = name === "project.hover" ? LIMITS.hoverGap : 50;
    const key = name === "project.hover" ? `${name}:${fields.slug ?? ""}` : name;
    const now = performance.now();
    if (now - (this.lastEmit.get(key) ?? -Infinity) < gap) return;
    this.lastEmit.set(key, now);
    const event: EventData = {
      name,
      slug: fields.slug ?? null,
      section: fields.section ?? null,
      key: fields.key ?? null,
      x: clamp(fields.x ?? this.pointer.x, 0, 1),
      y: clamp(fields.y ?? this.pointer.y, 0, 1),
    };
    for (const id of [...list]) this.callback(id, { kind: "event", event });
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    for (const t of this.timers.values()) {
      if (t.kind !== "every") continue;
      if (visible) this.startTimer(t);
      else this.stopTimer(t);
    }
    this.emit(visible ? "visible" : "hidden");
  }

  // ── keys ───────────────────────────────────────────────────────────────
  private clearPending(): void {
    if (this.pendingTimer !== null) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    this.keyState.pending = [];
  }

  /** Feed one normalised key. Returns true when the page should swallow it. */
  pressKey(key: string): boolean {
    const exclusive = this.keyState.mode ? (this.modes.get(this.keyState.mode) ?? false) : false;
    const r = resolveKey(this.bindings.values(), this.keyState, exclusive, key);
    this.clearPending();
    switch (r.type) {
      case "run":
        this.invoke(r.action);
        return true;
      case "pending":
        this.keyState.pending = r.pending;
        this.pendingTimer = setTimeout(() => this.clearPending(), LIMITS.sequenceMs);
        return true;
      case "exit":
        this.setMode(null);
        return true;
      case "cancel":
        return true;
      case "none":
        this.emit("key", { key });
        return r.swallow;
    }
  }

  private setMode(mode: string | null): void {
    this.clearPending();
    this.keyState = { mode, pending: [] };
    this.set({ mode });
  }

  // ── navigation ─────────────────────────────────────────────────────────
  goto(section: string): void {
    if (!(SECTIONS as readonly string[]).includes(section)) return;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (location.pathname !== "/") {
      this.host.navigate(section === "top" ? "/" : `/#${section}`);
      return;
    }
    if (section === "top") window.scrollTo({ top: 0, behavior });
    else document.getElementById(section)?.scrollIntoView({ behavior, block: "start" });
  }

  openProject(slug: string): void {
    if (this.slugs.has(slug)) this.host.navigate(`/work/${slug}/`);
  }

  openCard(): void {
    this.host.navigate("/card/");
  }

  openDocs(): void {
    this.host.navigate("/docs/");
  }

  // ── prompts ────────────────────────────────────────────────────────────
  /** The visitor answered (a value) or dismissed (null) the open prompt. */
  answerPrompt = (value: string | null): void => {
    const prompt = this.state.prompt;
    if (!prompt) return;
    this.set({ prompt: null });
    // A dismissed prompt that reopens itself must not loop: only a real answer is the visitor's doing.
    this.as(value === null ? "background" : "user", () =>
      this.callback(prompt.callback, { kind: "text", value }),
    );
    this.release(prompt.callback);
  };

  // ── timers ─────────────────────────────────────────────────────────────
  private startTimer(t: Timer): void {
    if (t.handle !== null) return;
    if (t.kind === "after") {
      t.handle = setTimeout(() => {
        this.timers.delete(t.id);
        t.handle = null;
        this.callback(t.id, { kind: "none" });
        this.release(t.id);
      }, t.ms);
    } else {
      t.handle = setInterval(() => {
        const res = this.callback(t.id, { kind: "none" });
        // A faulting or vanished callback must not keep firing.
        if (res?.outcome !== "ok") this.cancelTimer(t.id, res?.outcome !== "stale");
      }, t.ms);
    }
  }

  private stopTimer(t: Timer): void {
    if (t.handle !== null) clearTimeout(t.handle); // clearTimeout also clears intervals
    t.handle = null;
  }

  private cancelTimer(id: number, release: boolean): void {
    const t = this.timers.get(id);
    if (!t) return;
    this.stopTimer(t);
    this.timers.delete(id);
    if (release) this.release(id);
  }

  // ── effects ────────────────────────────────────────────────────────────
  /**
   * Apply one batch of effects on top of the current state. silent: a replay,
   * so nothing the visitor would notice (toasts, sound, fx, prompts,
   * navigation) happens, but handlers, timers and bindings still register.
   */
  private apply(all: readonly Effect[], { silent }: { silent: boolean }): void {
    const effects =
      all.length > LIMITS.effectsPerBatch ? all.slice(0, LIMITS.effectsPerBatch) : all;
    const look: Look = { ...this.state.look };
    const content: Content = {
      ...this.state.content,
      order: [...this.state.content.order],
      hidden: [...this.state.content.hidden],
      highlighted: [...this.state.content.highlighted],
      badges: Object.fromEntries(
        Object.entries(this.state.content.badges).map(([k, v]) => [k, [...v]]),
      ),
      readouts: this.state.content.readouts.map((r) => ({ ...r })),
    };
    const after: (() => void)[] = []; // run once the batch is committed
    let oneShots = 0;
    let registry = false;
    let scriptMuted = this.state.scriptMuted;
    let typeout = this.state.typeout;
    let decode = this.state.decode;
    let newPrompt: Prompt | null | undefined;
    const prevPrompt = this.state.prompt;

    const known = (v: unknown): v is string => typeof v === "string" && this.slugs.has(v);
    const addUnique = (list: string[], v: string) => {
      if (!list.includes(v)) list.push(v);
    };
    const oneShot = (f: () => void) => {
      if (silent || oneShots >= LIMITS.oneShotsPerBatch) return;
      oneShots++;
      after.push(f);
    };
    const fx = (c: FxCommand) => oneShot(() => this.command({ t: "fx", fx: c }));
    const dropCallback = (id: number | undefined) => {
      if (id !== undefined) after.push(() => this.release(id));
    };

    for (const { fn, args, callback: cb } of effects) {
      const a = args[0];
      const b = args[1];
      switch (fn) {
        // ── site ──
        case "site.action": {
          const spec = obj(a);
          const name = typeof spec?.name === "string" ? spec.name : "";
          if (
            !spec ||
            cb === undefined ||
            name.length > LIMITS.actionName ||
            !/^[a-z0-9_]+$/.test(name) ||
            (!this.actions.has(name) && this.actions.size >= LIMITS.actions)
          ) {
            dropCallback(cb);
            break;
          }
          const old = this.actions.get(name);
          if (old && old.callback !== cb) dropCallback(old.callback);
          this.actions.set(name, {
            name,
            title: text(spec.title, LIMITS.actionTitle) || name,
            description: text(spec.description, LIMITS.actionDescription),
            category: text(spec.category, LIMITS.category),
            keywords: (Array.isArray(spec.keywords) ? spec.keywords : [])
              .map((k) => text(k, LIMITS.keyword))
              .filter(Boolean)
              .slice(0, LIMITS.keywords),
            callback: cb,
          });
          registry = true;
          break;
        }
        case "site.on": {
          const list = this.handlers.get(String(a)) ?? [];
          if (
            cb === undefined ||
            typeof a !== "string" ||
            !(EVENT_NAMES as readonly string[]).includes(a) ||
            list.length >= LIMITS.handlersPerEvent
          ) {
            dropCallback(cb);
            break;
          }
          this.handlers.set(a, [...list, cb]);
          break;
        }
        case "site.stop": {
          for (const t of this.timers.values()) this.stopTimer(t);
          this.timers.clear();
          this.actions.clear();
          this.handlers.clear();
          this.bindings.clear();
          this.modes.clear();
          this.keyState = { mode: null, pending: [] };
          this.clearPending();
          registry = true;
          break;
        }
        case "site.invoke":
          if (typeof a === "string") after.push(() => this.invokeNow(a));
          break;
        case "site.title": {
          const t = text(a, LIMITS.title);
          content.title = t === "" ? null : t;
          break;
        }
        case "site.order":
          if (Array.isArray(a)) {
            content.order = [];
            for (const s of a) if (known(s)) addUnique(content.order, s);
          }
          break;
        case "site.hide":
          if (known(a)) addUnique(content.hidden, a);
          break;
        case "site.highlight":
          if (known(a)) addUnique(content.highlighted, a);
          break;
        case "site.badge": {
          const t = text(b, LIMITS.badge);
          if (!known(a) || t === "") break;
          const tags = content.badges[a] ?? [];
          if (!tags.includes(t) && tags.length < LIMITS.badgesPerCard) {
            content.badges[a] = [...tags, t];
          }
          break;
        }
        case "site.readout": {
          const label = text(a, LIMITS.readoutLabel);
          if (label === "") break;
          const value = text(b, LIMITS.readoutValue);
          const at = content.readouts.findIndex(
            (r) => r.label.toLowerCase() === label.toLowerCase(),
          );
          if (at !== -1) content.readouts[at] = { label, value };
          else if (content.readouts.length < LIMITS.readouts)
            content.readouts.push({ label, value });
          break;
        }
        case "site.goto":
          if (typeof a === "string") oneShot(() => this.goto(a));
          break;
        case "site.open":
          if (known(a)) oneShot(() => this.openProject(a));
          break;
        case "site.print":
          break; // console output: see scanLog

        // ── theme ──
        case "theme.hue": {
          const n = num(a);
          if (n !== null) look.hue = ((Math.round(n) % 360) + 360) % 360;
          break;
        }
        case "theme.weather":
          if ((WEATHERS as readonly unknown[]).includes(a)) look.weather = a as Look["weather"];
          break;
        case "theme.grid": {
          const n = num(a);
          if (n !== null) look.grid = n <= 0 ? 0 : clamp(Math.round(n), 16, 160);
          break;
        }
        case "theme.scanlines":
          if (typeof a === "boolean") look.scanlines = a;
          break;
        case "theme.glow": {
          const n = num(a);
          if (n !== null) look.glow = clamp(Math.round(n), 0, 100);
          break;
        }
        case "theme.mono":
          if (typeof a === "boolean") look.mono = a;
          break;
        case "theme.crt":
          if (typeof a === "boolean") look.crt = a;
          break;
        case "theme.flicker":
          // Flicker is an animation: ignored under prefers-reduced-motion.
          if (typeof a === "boolean" && !reducedMotion()) look.flicker = a;
          break;
        case "theme.invert":
          // Invert is allowed under prefers-reduced-motion only when the visitor asked for it.
          if (typeof a === "boolean" && (!reducedMotion() || this.origin === "user")) {
            look.invert = a;
          }
          break;
        case "theme.cursor":
          if ((CURSORS as readonly unknown[]).includes(a)) look.cursor = a as Look["cursor"];
          break;
        case "theme.scale": {
          const n = num(a);
          if (n !== null) look.scale = clamp(Math.round(n), 80, 130);
          break;
        }

        // ── fx ──
        case "fx.glitch": {
          const n = num(a);
          if (n !== null) fx({ kind: "glitch", ms: clamp(Math.round(n), 50, 2000) });
          break;
        }
        case "fx.shake": {
          const n = num(a);
          if (n !== null) fx({ kind: "shake", strength: clamp(Math.round(n), 1, 10) });
          break;
        }
        case "fx.flash":
          if (!silent && !reducedMotion() && this.allowStrobe()) fx({ kind: "flash" });
          break;
        case "fx.sparks":
          if (a === "" || known(a)) fx({ kind: "sparks", slug: a });
          break;
        case "fx.scan":
          fx({ kind: "scan" });
          break;
        case "fx.decode":
          if (!silent) decode = ++this.nonce;
          break;
        case "fx.typeout": {
          const t = text(a, LIMITS.typeout);
          if (!silent) typeout = t === "" ? null : { text: t, nonce: ++this.nonce };
          break;
        }

        // ── ui ──
        case "ui.toast": {
          const t = text(a, LIMITS.toast);
          const tone = TONES[String(b ?? "info").toLowerCase()] ?? "info";
          if (t !== "") oneShot(() => this.command({ t: "toast", text: t, tone }));
          break;
        }
        case "ui.banner":
          content.banner = text(a, LIMITS.banner);
          break;
        case "ui.pick":
        case "ui.input": {
          const spec = obj(a);
          if (!spec || cb === undefined || silent || !this.allowPrompt()) {
            dropCallback(cb);
            break;
          }
          this.lastPromptAt = performance.now();
          const kind = fn === "ui.pick" ? "pick" : "input";
          const items: PickItem[] = [];
          if (kind === "pick" && Array.isArray(spec.items)) {
            for (const raw of spec.items.slice(0, LIMITS.promptItems)) {
              const it = obj(raw);
              const id = text(it?.id, LIMITS.promptField);
              if (!it || id === "") continue;
              items.push({
                id,
                title: text(it.title, LIMITS.promptField) || id,
                subtitle: text(it.subtitle, LIMITS.promptField),
                detail: text(it.detail, LIMITS.promptField),
              });
            }
          }
          if (newPrompt) dropCallback(newPrompt.callback);
          newPrompt = {
            id: ++this.promptId,
            kind,
            title: text(spec.title, LIMITS.promptTitle),
            placeholder: text(spec.placeholder, LIMITS.promptField),
            items,
            value: text(spec.value, LIMITS.promptField),
            confirm: text(spec.confirm, 16),
            callback: cb,
          };
          break;
        }
        case "ui.palette":
          if (this.allowPrompt()) {
            this.lastPromptAt = performance.now();
            oneShot(() => this.openPalette());
          }
          break;

        // ── keys ──
        case "keys.bind": {
          const parsed = typeof a === "string" ? parseBinding(a) : null;
          const action = text(b, LIMITS.actionName + 8);
          if (!parsed && typeof a === "string" && parseBinding(a, true) !== null) {
            this.set({
              log: [
                ...this.state.log,
                this.logLine(
                  "error",
                  `keys.bind: "${text(a, 40)}" is reserved and cannot be bound`,
                ),
              ].slice(-LIMITS.log),
            });
          }
          if (!parsed || action === "") break;
          if (!this.bindings.has(parsed.canon) && this.bindings.size >= LIMITS.bindings) break;
          this.bindings.set(parsed.canon, { ...parsed, action });
          registry = true;
          break;
        }
        case "keys.unbind": {
          const parsed = typeof a === "string" ? parseBinding(a) : null;
          if (parsed && this.bindings.delete(parsed.canon)) registry = true;
          break;
        }
        case "keys.mode":
          if (typeof a === "string" && isModeName(a) && typeof b === "boolean") {
            this.modes.set(a, b);
          }
          break;
        case "keys.enter":
          if (typeof a === "string" && isModeName(a)) {
            this.setMode(a);
          }
          break;
        case "keys.exit":
          this.setMode(null);
          break;

        // ── time ──
        case "time.after":
        case "time.every": {
          const ms = num(a);
          if (cb === undefined || ms === null || this.timers.has(cb)) {
            dropCallback(cb);
            break;
          }
          if (this.timers.size >= LIMITS.timers) {
            dropCallback(cb);
            break;
          }
          const kind = fn === "time.after" ? "after" : "every";
          const min = kind === "after" ? LIMITS.afterMin : LIMITS.everyMin;
          const timer: Timer = {
            id: cb,
            kind,
            ms: clamp(Math.round(ms), min, LIMITS.timerMax),
            handle: null,
          };
          this.timers.set(cb, timer);
          if (kind === "after" || this.visible) this.startTimer(timer);
          break;
        }
        case "time.cancel": {
          const id = num(a);
          if (id !== null) this.cancelTimer(id, false); // the wasm releases it too
          break;
        }

        // ── sound ──
        case "sound.beep": {
          const hz = num(a);
          const ms = num(b);
          if (hz !== null && ms !== null) {
            const h = clamp(Math.round(hz), 40, 4000);
            const d = clamp(Math.round(ms), 10, 1000);
            oneShot(() => sound.beep(h, d, this.muted));
          }
          break;
        }
        case "sound.chord": {
          const ms = num(b);
          const notes = Array.isArray(a)
            ? a
                .map(num)
                .filter((n): n is number => n !== null)
                .slice(0, 6)
                .map((n) => clamp(Math.round(n), 40, 4000))
            : [];
          if (ms !== null && notes.length) {
            const d = clamp(Math.round(ms), 10, 1000);
            oneShot(() => sound.chord(notes, d, this.muted));
          }
          break;
        }
        case "sound.mute":
          if (typeof a === "boolean") scriptMuted = a;
          break;
      }
    }

    // Commit: replace slices only when something changed, so a handler that
    // changes nothing does not re-render the page.
    const patch: Partial<EngineState> = {};
    // Look flips share the global strobe budget; a flip over budget is dropped.
    for (const k of ["invert", "flicker"] as const) {
      if (look[k] !== this.state.look[k] && !(silent ? true : this.allowStrobe())) {
        look[k] = this.state.look[k];
      }
    }
    if (!sameLook(look, this.state.look)) patch.look = look;
    if (JSON.stringify(content) !== JSON.stringify(this.state.content)) patch.content = content;
    if (scriptMuted !== this.state.scriptMuted) patch.scriptMuted = scriptMuted;
    if (typeout !== this.state.typeout) patch.typeout = typeout;
    if (decode !== this.state.decode) patch.decode = decode;
    if (newPrompt !== undefined) patch.prompt = newPrompt;
    if (Object.keys(patch).length) this.set(patch);
    if (registry) this.publishRegistry();
    if (newPrompt) this.set({ paletteOpen: false });

    // A prompt that is replaced answers the old one with null, after commit.
    if (newPrompt && prevPrompt) {
      after.push(() => {
        this.callback(prevPrompt.callback, { kind: "text", value: null });
        this.release(prevPrompt.callback);
      });
    }
    for (const f of after) f();
  }
}

const obj = (v: Value | undefined): Record<string, Value> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v : null;

const sameLook = (a: Look, b: Look) =>
  (Object.keys(a) as (keyof Look)[]).every((k) => a[k] === b[k]);
