"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { EXAMPLES } from "@/lib/eitri/examples";
import { encodeShare } from "@/lib/eitri/runtime";
import { CodeView } from "./CodeView";
import { useEngine, useEngineState } from "./engine-context";
import { useDocked } from "./useDocked";
import { Runs, useHighlight } from "./useHighlight";

// Run time, with the unit kept lowercase inside uppercase labels ("µ" would
// otherwise become the Greek capital "Μ").
function Duration({ micros }: { micros: number }) {
  const [value, unit] = micros < 1000 ? [String(micros), "µs"] : [(micros / 1000).toFixed(1), "ms"];
  return (
    <span className="tabular-nums">
      {value} <span className="normal-case">{unit}</span>
    </span>
  );
}

type TabId = "output" | "tokens" | "ast" | "asm" | "docs";
const TABS: { id: TabId; label: string }[] = [
  { id: "output", label: "Output" },
  { id: "tokens", label: "Tokens" },
  { id: "ast", label: "AST" },
  { id: "asm", label: "Bytecode" },
  { id: "docs", label: "Docs" },
];

const OUTCOME: Record<string, { label: string; tone: string }> = {
  ok: { label: "OK", tone: "text-ok" },
  compile: { label: "Compile error", tone: "text-err" },
  fault: { label: "Runtime fault", tone: "text-err" },
  error: { label: "Host error", tone: "text-err" },
  stale: { label: "Stale", tone: "text-err" },
};

const TONE_CLASS = { info: "text-signal", ok: "text-ok", warn: "text-warn", error: "text-err" };

const FOCUSABLE =
  'a[href],button:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const btn =
  "label border border-line-strong px-3 py-2 transition-colors hover:border-signal hover:text-signal disabled:opacity-50";

// The SDK files the Docs tab offers (public/eitri/sdk/index.json is generated
// by scripts/sync-assets.mjs; this is the fallback if it cannot be fetched).
const FALLBACK_SDK = [
  "site.eith",
  "site/fx.eith",
  "site/keys.eith",
  "site/sound.eith",
  "site/theme.eith",
  "site/time.eith",
  "site/ui.eith",
];
const moduleName = (file: string) => file.replace(/\.eith$/, "");

const textMetrics = "px-3 py-3 font-mono text-xs leading-5 whitespace-pre";

// Docked width: remembered per browser, kept between a usable console and a
// usable page.
const WIDTH_KEY = "eitri.console.width";
const MIN_WIDTH = 360;
const MIN_PAGE = 480;
const clampWidth = (w: number) =>
  Math.round(Math.max(MIN_WIDTH, Math.min(w, window.innerWidth - MIN_PAGE)));
const initialWidth = () => {
  const saved = Number(localStorage.getItem(WIDTH_KEY));
  return clampWidth(saved > 0 ? saved : Math.min(680, Math.max(440, window.innerWidth * 0.4)));
};

export function Console() {
  const engine = useEngine();
  const script = useEngineState((s) => s.script);
  const running = useEngineState((s) => s.running);
  const last = useEngineState((s) => s.last);
  const log = useEngineState((s) => s.log);
  const actionCount = useEngineState((s) => s.actions.length);
  const bindingCount = useEngineState((s) => s.bindings.length);
  const { setScript, closeConsole } = engine;
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLPreElement>(null);
  const tabFocus = useRef(false); // Ctrl+M: let Tab leave the editor
  const [tab, setTab] = useState<TabId>("output");
  const [view, setView] = useState<{ tab: TabId; ok: boolean; text: string } | null>(null);
  const [sdk, setSdk] = useState<string[] | null>(null);
  const [moduleFile, setModuleFile] = useState("site.eith");
  const [docs, setDocs] = useState<Record<string, string>>({});

  const runs = useHighlight(script);
  const docked = useDocked();
  const panel = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(initialWidth);

  // Docked: tell the page how much room the console takes, so it reflows.
  useEffect(() => {
    if (!docked) return;
    const root = document.documentElement;
    root.dataset.console = "docked";
    root.style.setProperty("--console-w", `${width}px`);
    localStorage.setItem(WIDTH_KEY, String(width));
    return () => {
      delete root.dataset.console;
      root.style.removeProperty("--console-w");
    };
  }, [docked, width]);
  useEffect(() => {
    if (!docked) return;
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [docked]);

  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setWidth(clampWidth(window.innerWidth - ev.clientX));
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      document.documentElement.removeAttribute("data-resizing");
    };
    document.documentElement.setAttribute("data-resizing", "");
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  };
  const onHandleKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 80 : 20;
    if (e.key === "ArrowLeft") setWidth((w) => clampWidth(w + step));
    else if (e.key === "ArrowRight") setWidth((w) => clampWidth(w - step));
    else return;
    e.preventDefault();
  };

  // Focus: into the editor on open, back to the trigger on close. Esc closes,
  // Tab wraps inside the dialog. A palette opened over the console owns the keys.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    editor.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const s = engine.getState();
      if (s.paletteOpen || s.prompt) return;
      // Docked, the page stays usable: Esc closes only from inside the console,
      // and Tab is not trapped.
      if (docked) {
        if (e.key === "Escape" && panel.current?.contains(document.activeElement)) {
          e.preventDefault();
          closeConsole();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeConsole();
      } else if (e.key === "Tab" && !e.defaultPrevented && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const lastEl = items[items.length - 1];
        if (!first || !lastEl) return;
        const active = document.activeElement;
        if (!dialog.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [closeConsole, engine, docked]);

  const runNow = useCallback(() => void engine.run(script, { save: true }), [engine, script]);

  const onEditorKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runNow();
    } else if (e.key.toLowerCase() === "m" && e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      tabFocus.current = !tabFocus.current;
      engine.toast(tabFocus.current ? "Tab moves focus (Ctrl+M to undo)" : "Tab inserts spaces");
    } else if (e.key === "Tab" && !e.shiftKey && !tabFocus.current) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = ta;
      setScript(`${script.slice(0, s)}    ${script.slice(end)}`);
      requestAnimationFrame(() => ta.setSelectionRange(s + 4, s + 4));
    }
  };

  // Tokens / AST / Bytecode follow the editor (debounced) while their tab is open.
  useEffect(() => {
    if (tab === "output" || tab === "docs") return;
    let live = true;
    const t = setTimeout(() => {
      engine
        .inspect(script, tab)
        .then((r) => live && setView({ tab, ...r }))
        .catch((err) => live && setView({ tab, ok: false, text: String(err) }));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [tab, script, engine]);

  // Docs: the module list, then the chosen file.
  useEffect(() => {
    if (tab !== "docs" || sdk !== null) return;
    fetch("/eitri/sdk/index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: unknown) =>
        setSdk(
          Array.isArray(list) && list.every((f) => typeof f === "string")
            ? (list as string[])
            : FALLBACK_SDK,
        ),
      )
      .catch(() => setSdk(FALLBACK_SDK));
  }, [tab, sdk]);
  useEffect(() => {
    if (tab !== "docs" || sdk === null || docs[moduleFile] !== undefined) return;
    fetch(`/eitri/sdk/${moduleFile}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => setDocs((d) => ({ ...d, [moduleFile]: text })))
      .catch(() => setDocs((d) => ({ ...d, [moduleFile]: `// could not load ${moduleFile}` })));
  }, [tab, sdk, moduleFile, docs]);

  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i + TABS.length - 1) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : -1;
    const target = TABS[next];
    if (!target) return;
    e.preventDefault();
    setTab(target.id);
    document.getElementById(`${id}-tab-${target.id}`)?.focus();
  };

  const share = async () => {
    const url = `${location.origin + location.pathname}#eitri=${encodeShare(script)}`;
    try {
      await navigator.clipboard.writeText(url);
      engine.toast("Share link copied");
    } catch {
      engine.toast("Could not copy the link", "warn");
    }
  };

  const lines = script.split("\n").length;
  const outcome = last ? OUTCOME[last.outcome] : null;
  const groups = useMemo(() => [...new Set(EXAMPLES.map((x) => x.group))], []);

  const body = (
    <div
      className={
        docked
          ? "flex min-w-0 flex-1 flex-col gap-3 p-4"
          : "hud flex h-[min(70dvh,34rem)] flex-col gap-3 p-3 sm:p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={`${id}-title`} className="label text-signal">
          {"EITRI // CONSOLE"}
        </h2>
        <span className="label font-mono tabular-nums" title="compile + run time">
          {last ? <Duration micros={last.micros} /> : "—"}
        </span>
        {outcome && <span className={`label ${outcome.tone}`}>{outcome.label}</span>}
        {(actionCount > 0 || bindingCount > 0) && (
          <span className="label hidden sm:inline">
            {actionCount} {actionCount === 1 ? "action" : "actions"} · {bindingCount}{" "}
            {bindingCount === 1 ? "key" : "keys"}
          </span>
        )}
        <button type="button" onClick={closeConsole} className={`${btn} ml-auto`}>
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="chamfer label bg-signal px-5 py-2 font-medium text-void transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>
        <label className="sr-only" htmlFor={`${id}-examples`}>
          Examples
        </label>
        <select
          id={`${id}-examples`}
          value=""
          onChange={(e) => {
            const ex = EXAMPLES.find((x) => x.id === e.target.value);
            if (ex) setScript(ex.source);
          }}
          className={`${btn} bg-void`}
        >
          <option value="">Examples…</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {EXAMPLES.filter((x) => x.group === g).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={engine.reset} className={btn}>
          Reset
        </button>
        <button type="button" onClick={share} className={btn}>
          Share
        </button>
      </div>

      <div
        className={
          docked
            ? "grid min-h-0 flex-1 grid-rows-[3fr_2fr] gap-3"
            : "grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1"
        }
      >
        {/* Editor: a transparent textarea over a highlighted copy of its text. */}
        <div className="relative flex min-h-0 border border-line bg-void/60">
          <div
            ref={gutter}
            aria-hidden="true"
            className="overflow-hidden border-r border-line px-2 py-3 text-right font-mono text-xs leading-5 whitespace-pre text-ink-3 select-none"
          >
            {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
            {"\n\n"}
          </div>
          <div className="relative min-w-0 flex-1">
            {runs && (
              <pre
                ref={layer}
                aria-hidden="true"
                className={
                  "pointer-events-none absolute inset-0 m-0 overflow-hidden text-ink " + textMetrics
                }
              >
                <code>
                  <Runs runs={runs} />
                  {"\n"}
                </code>
              </pre>
            )}
            <textarea
              ref={editor}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onKeyDown={onEditorKey}
              onScroll={(e) => {
                const ta = e.currentTarget;
                if (gutter.current) gutter.current.scrollTop = ta.scrollTop;
                if (layer.current) {
                  layer.current.scrollTop = ta.scrollTop;
                  layer.current.scrollLeft = ta.scrollLeft;
                }
              }}
              aria-label="Eitri script"
              aria-describedby={`${id}-hint`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              className={
                "absolute inset-0 size-full resize-none overflow-auto bg-transparent focus-visible:outline-offset-[-3px] " +
                textMetrics +
                (runs ? " text-transparent caret-ink" : " text-ink")
              }
            />
          </div>
          <p id={`${id}-hint`} className="sr-only">
            Tab inserts four spaces. Press Control M to make Tab move focus instead.
          </p>
        </div>

        {/* Results */}
        <div className="flex min-h-0 flex-col border border-line bg-void/60">
          <div role="tablist" aria-label="Console views" className="flex border-b border-line">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                id={`${id}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`${id}-panel`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={
                  "label px-3 py-2.5 transition-colors hover:text-signal " +
                  (tab === t.id ? "border-b border-signal text-signal" : "")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${tab}`}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard reachable
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto p-3"
          >
            {tab === "output" && (
              <div aria-live="polite" className="font-mono text-xs leading-5">
                {last ? (
                  <>
                    <p className={`label mb-2 ${outcome?.tone ?? ""}`}>
                      {outcome?.label} · <Duration micros={last.micros} />
                    </p>
                    {last.report && (
                      <pre className="mb-3 whitespace-pre-wrap text-err">{last.report}</pre>
                    )}
                    {log.map((r) => (
                      <pre
                        key={r.id}
                        className={
                          "whitespace-pre-wrap " +
                          (r.kind === "error"
                            ? "text-err"
                            : r.kind === "toast"
                              ? "text-ink-2"
                              : "text-ink")
                        }
                      >
                        {r.kind === "toast" && (
                          <span className={TONE_CLASS[r.tone ?? "info"]}>toast </span>
                        )}
                        {r.text}
                      </pre>
                    ))}
                    {last.outcome === "ok" && log.length === 0 && (
                      <p className="text-ink-3">Ran cleanly. Nothing printed.</p>
                    )}
                  </>
                ) : (
                  <p className="text-ink-3">Run a script to see output. ⌘/Ctrl+Enter works too.</p>
                )}
              </div>
            )}
            {(tab === "tokens" || tab === "ast" || tab === "asm") && (
              <pre
                className={
                  "font-mono text-xs leading-5 whitespace-pre " +
                  (view?.ok === false ? "text-err" : "text-ink-2")
                }
              >
                {view?.tab === tab ? view.text : "…"}
              </pre>
            )}
            {tab === "docs" && (
              <div>
                <fieldset className="m-0 mb-3 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
                  <legend className="sr-only">SDK modules</legend>
                  {(sdk ?? [moduleFile]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={f === moduleFile}
                      onClick={() => setModuleFile(f)}
                      className={
                        "label border px-2 py-1 normal-case transition-colors hover:text-signal " +
                        (f === moduleFile ? "border-signal text-signal" : "border-line")
                      }
                    >
                      {moduleName(f)}
                    </button>
                  ))}
                </fieldset>
                <p className="label mb-2 normal-case">
                  {"import "}
                  {moduleName(moduleFile).split("/").pop()}
                  {' from "'}
                  {moduleName(moduleFile)}
                  {'"'}
                </p>
                {docs[moduleFile] !== undefined ? (
                  <CodeView text={docs[moduleFile] ?? ""} />
                ) : (
                  <p className="text-ink-3">…</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="label hidden normal-case lg:block">
        ⌘/Ctrl+Enter run · Esc close · ⌘/Ctrl+K commands · drag the left edge to resize
      </p>
    </div>
  );

  if (docked) {
    return (
      <aside
        ref={panel}
        aria-labelledby={`${id}-title`}
        style={{ width: "var(--console-w)" }}
        className="fixed inset-y-0 right-0 z-50 flex border-l border-line-strong bg-void/95 text-ink backdrop-blur-md"
      >
        <button
          type="button"
          aria-label={`Resize console, ${width} pixels wide. Arrow keys resize.`}
          onPointerDown={startDrag}
          onKeyDown={onHandleKey}
          className="w-1.5 shrink-0 cursor-col-resize bg-line transition-colors hover:bg-signal/50 focus-visible:bg-signal/70"
        />
        {body}
      </aside>
    );
  }

  return (
    <dialog
      ref={dialog}
      open
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-0 bottom-0 z-50 m-0 h-auto max-h-none w-full max-w-none border-0 bg-void/90 p-2 text-ink backdrop-blur-md sm:p-3"
    >
      {body}
    </dialog>
  );
}
