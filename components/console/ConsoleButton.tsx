"use client";

import { useSyncExternalStore } from "react";
import { useEngine, useEngineState } from "./engine-context";

const noSubscribe = () => () => {};
const isMac = () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

const button =
  "label flex h-8 items-center gap-2 border border-line-strong px-2 transition-colors hover:border-signal hover:text-signal @xl:px-3";
const kbd =
  "hidden min-w-9 border border-line px-1.5 py-0.5 text-center font-mono text-[0.625rem] text-ink-3 @5xl:inline-block";

// The two entry points: the command palette (Cmd/Ctrl K) and the console (backtick).
export function ConsoleButton() {
  const engine = useEngine();
  const consoleOpen = useEngineState((s) => s.consoleOpen);
  const paletteOpen = useEngineState((s) => s.paletteOpen);
  // "Ctrl K" on the server and during hydration, "⌘K" on Apple devices after.
  const hint = useSyncExternalStore(
    noSubscribe,
    () => (isMac() ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );

  return (
    <div className="flex items-center gap-1.5 @xl:gap-2">
      <button
        type="button"
        onClick={engine.openPalette}
        aria-haspopup="dialog"
        aria-expanded={paletteOpen}
        aria-keyshortcuts="Control+K Meta+K"
        className={button}
      >
        <span className="hidden @3xl:inline">Commands</span>
        <span className="@3xl:hidden">Cmd</span>
        <kbd className={kbd}>{hint}</kbd>
      </button>
      <button
        type="button"
        onClick={engine.toggleConsole}
        aria-haspopup="dialog"
        aria-expanded={consoleOpen}
        aria-keyshortcuts="`"
        className={button}
      >
        <span className="hidden @xl:inline">Console</span>
        <span aria-hidden="true" className="font-mono @xl:hidden">
          &gt;_
        </span>
        <span className="sr-only @xl:hidden">Console</span>
        <kbd className={kbd}>`</kbd>
      </button>
    </div>
  );
}
