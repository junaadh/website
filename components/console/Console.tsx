"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { EXAMPLES } from "@/lib/eitri/examples";
import { encodeShare } from "@/lib/eitri/runtime";
import { useConsole } from "./SiteProvider";

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
};

const FOCUSABLE =
  'a[href],button:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const btn =
  "label border border-line-strong px-3 py-2 transition-colors hover:border-signal hover:text-signal disabled:opacity-50";

export function Console() {
  const { script, setScript, run, running, last, reset, closeConsole, notify, inspect } =
    useConsole();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const tabFocus = useRef(false); // Ctrl+M: let Tab leave the editor
  const [tab, setTab] = useState<TabId>("output");
  const [view, setView] = useState<{ tab: TabId; ok: boolean; text: string } | null>(null);
  const [docs, setDocs] = useState<string | null>(null);

  // Focus: into the editor on open, back to the trigger on close. Esc closes,
  // Tab wraps inside the dialog.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    editor.current?.focus();
    const onKey = (e: KeyboardEvent) => {
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
  }, [closeConsole]);

  const runNow = useCallback(() => void run(script, { save: true }), [run, script]);

  const onEditorKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runNow();
    } else if (e.key.toLowerCase() === "m" && e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      tabFocus.current = !tabFocus.current;
      notify(tabFocus.current ? "Tab moves focus (Ctrl+M to undo)" : "Tab inserts spaces");
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
      inspect(script, tab)
        .then((r) => live && setView({ tab, ...r }))
        .catch((err) => live && setView({ tab, ok: false, text: String(err) }));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [tab, script, inspect]);

  useEffect(() => {
    if (tab !== "docs" || docs !== null) return;
    fetch("/eitri/site.eith")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then(setDocs)
      .catch(() => setDocs("// could not load site.eith"));
  }, [tab, docs]);

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
    const url = `${location.origin}${location.pathname}#eitri=${encodeShare(script)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Share link copied");
    } catch {
      notify("Could not copy the link");
    }
  };

  const lines = script.split("\n").length;
  const rows = [
    ...(last?.prints ?? []).map((text, n) => ({ key: `p${n}`, text, toast: false })),
    ...(last?.toasts ?? []).map((text, n) => ({ key: `t${n}`, text, toast: true })),
  ];
  const outcome = last ? OUTCOME[last.outcome] : null;

  return (
    <dialog
      ref={dialog}
      open
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-0 bottom-0 z-50 m-0 h-auto max-h-none w-full max-w-none border-0 bg-void/90 p-2 text-ink backdrop-blur-md sm:p-3"
    >
      <div className="hud flex h-[min(70dvh,34rem)] flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={`${id}-title`} className="label text-signal">
            {"EITRI // CONSOLE"}
          </h2>
          <span className="label font-mono tabular-nums" title="compile + run time">
            {last ? <Duration micros={last.micros} /> : "—"}
          </span>
          {outcome && <span className={`label ${outcome.tone}`}>{outcome.label}</span>}
          <span className="label ml-auto hidden lg:inline">⌘/Ctrl+Enter run · Esc close</span>
          <button type="button" onClick={closeConsole} className={`${btn} ml-auto lg:ml-0`}>
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
            {EXAMPLES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={reset} className={btn}>
            Reset
          </button>
          <button type="button" onClick={share} className={btn}>
            Share
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
          {/* Editor */}
          <div className="relative flex min-h-0 border border-line bg-void/60">
            <div
              ref={gutter}
              aria-hidden="true"
              className="overflow-hidden border-r border-line px-2 py-3 text-right font-mono text-xs leading-5 whitespace-pre text-ink-3 select-none"
            >
              {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
              {"\n\n"}
            </div>
            <textarea
              ref={editor}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onKeyDown={onEditorKey}
              onScroll={(e) => {
                if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
              }}
              aria-label="Eitri script"
              aria-describedby={`${id}-hint`}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              className="min-w-0 flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-xs leading-5 whitespace-pre text-ink focus-visible:outline-offset-[-3px]"
            />
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
                  className={`label px-3 py-2.5 transition-colors hover:text-signal ${
                    tab === t.id ? "border-b border-signal text-signal" : ""
                  }`}
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
                      {rows.map((r) => (
                        <pre
                          key={r.key}
                          className={`whitespace-pre-wrap ${r.toast ? "text-ink-2" : "text-ink"}`}
                        >
                          {r.toast && <span className="text-signal">toast </span>}
                          {r.text}
                        </pre>
                      ))}
                      {last.outcome === "ok" && !last.prints.length && !last.toasts.length && (
                        <p className="text-ink-3">Ran cleanly. Nothing printed.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-ink-3">
                      Run a script to see output. ⌘/Ctrl+Enter works too.
                    </p>
                  )}
                </div>
              )}
              {(tab === "tokens" || tab === "ast" || tab === "asm") && (
                <pre
                  className={`font-mono text-xs leading-5 whitespace-pre ${
                    view?.ok === false ? "text-err" : "text-ink-2"
                  }`}
                >
                  {view?.tab === tab ? view.text : "…"}
                </pre>
              )}
              {tab === "docs" && (
                <pre className="font-mono text-xs leading-5 whitespace-pre text-ink-2">
                  {docs ?? "…"}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
