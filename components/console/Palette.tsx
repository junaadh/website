"use client";

/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- this is the ARIA dialog + combobox + listbox pattern; keyboard use goes through the combobox input */

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { BUILTIN_KEYS } from "@/lib/eitri/builtins";
import { bestScore } from "@/lib/eitri/fuzzy";
import { prettyKey } from "@/lib/eitri/keys";
import { useEngine, useEngineState } from "./engine-context";

interface Entry {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  group: string;
  keys: string[]; // canonical binding strings
  fields: string[]; // what the query is matched against
}

const GROUP_ORDER = ["Navigate", "Projects", "Look", "Console"];
const isMac = () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

const MAC_CAPS: Record<string, string> = { Cmd: "⌘", Shift: "⇧", Alt: "⌥", Ctrl: "⌃" };

function Keys({ canon }: { canon: string }) {
  const mac = isMac();
  const steps = prettyKey(canon);
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {steps.map((step, i) => (
        <span
          key={steps
            .slice(0, i + 1)
            .map((s) => s.join("+"))
            .join(">")}
          className="flex items-center gap-1"
        >
          {i > 0 && <span className="label text-[0.625rem]">then</span>}
          {step.map((cap) => (
            <kbd
              key={cap}
              className="min-w-5 border border-line px-1.5 py-0.5 text-center font-mono text-[0.625rem] text-ink-3"
            >
              {mac ? (MAC_CAPS[cap] ?? cap) : cap}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

// The command palette (Cmd/Ctrl K) and, with a prompt open, ui.pick / ui.input.
export function Palette() {
  const prompt = useEngineState((s) => s.prompt);
  // A new prompt remounts the dialog, so its query and selection start fresh.
  return <PaletteDialog key={prompt?.id ?? 0} />;
}

function PaletteDialog() {
  const engine = useEngine();
  const prompt = useEngineState((s) => s.prompt);
  const scriptActions = useEngineState((s) => s.actions);
  const bindings = useEngineState((s) => s.bindings);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(prompt?.kind === "input" ? prompt.value : "");
  const [cursor, setCursor] = useState(0);

  const kind = prompt?.kind ?? "command";

  const entries = useMemo<Entry[]>(() => {
    if (prompt?.kind === "pick") {
      return prompt.items.map((it) => ({
        id: it.id,
        title: it.title,
        subtitle: it.subtitle,
        detail: it.detail,
        group: "",
        keys: [],
        fields: [it.title, it.subtitle, it.detail, it.id],
      }));
    }
    if (prompt) return [];
    const keysFor = (name: string) => bindings.filter((b) => b.action === name).map((b) => b.key);
    const all = [...scriptActions, ...[...engine.builtins.values()].map((b) => b.info)];
    return all.map((a) => ({
      id: a.name,
      title: a.title,
      subtitle: a.description,
      detail: "",
      group: a.category,
      keys: [...(BUILTIN_KEYS[a.name] ? [BUILTIN_KEYS[a.name] as string] : []), ...keysFor(a.name)],
      fields: [a.title, a.name, ...a.keywords, a.category],
    }));
  }, [prompt, scriptActions, bindings, engine]);

  // Filter, rank, then group (command mode) keeping the best group first.
  const rows = useMemo(() => {
    const q = query.trim();
    const scored = entries
      .map((e, i) => ({ e, i, s: q === "" ? 0 : bestScore(q, e.fields) }))
      .filter((x): x is { e: Entry; i: number; s: number } => x.s !== null);
    if (q !== "") scored.sort((a, b) => b.s - a.s || a.i - b.i);
    if (kind !== "command") return scored.map((x) => ({ ...x.e, heading: false }));
    const groups = new Map<string, Entry[]>();
    for (const { e } of scored) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
    const names = [...groups.keys()];
    if (q === "") {
      const rank = (g: string) => {
        const at = GROUP_ORDER.indexOf(g);
        return at === -1 ? -1 : at; // script groups first
      };
      names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    }
    return names.flatMap((g) => (groups.get(g) ?? []).map((e, n) => ({ ...e, heading: n === 0 })));
  }, [entries, query, kind]);

  const active = Math.min(cursor, rows.length - 1);

  // Focus in, trap it while open, hand it back on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const onFocusIn = (e: FocusEvent) => {
      if (dialog.current && !dialog.current.contains(e.target as Node)) input.current?.focus();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, []);

  const submit = (entry: Entry | undefined) => {
    if (kind === "input") {
      engine.answerPrompt(query);
    } else if (kind === "pick") {
      if (entry) engine.answerPrompt(entry.id);
    } else if (entry) {
      engine.closePalette();
      engine.invoke(entry.id);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = rows.length - 1;
    const go = (n: number) => {
      e.preventDefault();
      setCursor(last < 0 ? 0 : (n + rows.length) % rows.length);
    };
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      engine.closePalette();
    } else if (e.key === "Tab") {
      e.preventDefault(); // the input is the only stop
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit(rows[active]);
    } else if (kind !== "input") {
      if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) go(active + 1);
      else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) go(active - 1);
      else if (e.key === "PageDown") go(Math.min(last, active + 8));
      else if (e.key === "PageUp") go(Math.max(0, active - 8));
    }
  };

  const title = prompt?.title || (kind === "command" ? "Command palette" : "Choose");
  const placeholder =
    prompt?.placeholder ||
    (kind === "command" ? "Type a command" : kind === "input" ? "" : "Filter");
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop click dismisses; Esc does too
    <div
      className="fixed inset-0 z-[70] bg-void/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) engine.closePalette();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        className="hud mx-auto mt-[12vh] flex max-h-[70dvh] w-[min(40rem,calc(100vw-1.5rem))] flex-col bg-void/95 backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 pt-3 pb-2">
          <span className="label text-signal">
            {kind === "command" ? `CMD // ${title}` : title}
          </span>
          <span className="flex items-center gap-3">
            {prompt && (
              <button
                type="button"
                onClick={engine.reset}
                className="label border border-line px-2 py-1 transition-colors hover:border-err hover:text-err"
                title="Clear the saved script and restore the page"
              >
                Reset site
              </button>
            )}
            <span className="label hidden sm:inline">
              Esc {kind === "command" ? "closes" : "dismisses"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span aria-hidden="true" className="font-mono text-sm text-signal">
            &gt;
          </span>
          {kind === "input" ? (
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={title}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
          ) : (
            <input
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              placeholder={placeholder}
              role="combobox"
              aria-label={title}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={rows.length ? optionId(active) : undefined}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink placeholder:text-ink-3 focus:outline-none"
            />
          )}
          {kind === "input" && (
            <button
              type="button"
              onClick={() => submit(undefined)}
              className="chamfer label bg-signal px-3 py-1.5 font-medium text-void transition-opacity hover:opacity-85"
            >
              {prompt?.confirm || "OK"}
            </button>
          )}
        </div>
        {kind !== "input" && (
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label={title}
            className="min-h-0 flex-1 overflow-auto py-2"
          >
            {rows.length === 0 && <p className="label px-4 py-6">Nothing matches</p>}
            {rows.map((r, i) => (
              <div key={r.id} role="presentation">
                {r.heading && r.group && (
                  <p aria-hidden="true" className="label px-4 pt-3 pb-1 text-[0.625rem]">
                    {r.group}
                  </p>
                )}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard use goes through the combobox input */}
                <div
                  id={optionId(i)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === active}
                  onMouseMove={() => i !== cursor && setCursor(i)}
                  onClick={() => submit(r)}
                  className={`flex cursor-pointer items-center justify-between gap-4 border-l-2 px-4 py-2 ${
                    i === active ? "border-signal bg-signal/10" : "border-transparent"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{r.title}</span>
                    {(r.subtitle || r.group) && (
                      <span className="block truncate text-xs text-ink-3">
                        {r.group && <span className="sr-only">{r.group}. </span>}
                        {r.subtitle}
                      </span>
                    )}
                  </span>
                  {r.detail && <span className="label shrink-0 normal-case">{r.detail}</span>}
                  {r.keys.length > 0 && (
                    <span className="flex shrink-0 gap-2">
                      {r.keys.slice(0, 2).map((k) => (
                        <Keys key={k} canon={k} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="label flex gap-4 border-t border-line px-4 py-2 text-[0.625rem]">
          {kind !== "input" && <span>↑↓ move</span>}
          <span>
            Enter{" "}
            {kind === "command" ? "run" : kind === "pick" ? "choose" : prompt?.confirm || "submit"}
          </span>
          <span>Esc {kind === "command" ? "close" : "dismiss"}</span>
          <span className="ml-auto" aria-live="polite">
            {kind !== "input" && rows.length + (rows.length === 1 ? " result" : " results")}
          </span>
        </p>
      </div>
    </div>
  );
}
