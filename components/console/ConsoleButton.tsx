"use client";

import { useSyncExternalStore } from "react";
import { useConsole } from "./SiteProvider";

const noSubscribe = () => () => {};
const isMac = () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export function ConsoleButton() {
  const { isOpen, toggleConsole } = useConsole();
  // "Ctrl K" on the server and during hydration, "⌘K" on Apple devices after.
  const hint = useSyncExternalStore(
    noSubscribe,
    () => (isMac() ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );

  return (
    <button
      type="button"
      onClick={toggleConsole}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-keyshortcuts="Control+K Meta+K"
      className="label flex h-8 items-center gap-2 border border-line-strong px-3 transition-colors hover:border-signal hover:text-signal"
    >
      Console
      <kbd className="hidden min-w-9 border border-line px-1.5 py-0.5 text-center font-mono text-[0.625rem] text-ink-3 sm:inline-block">
        {hint}
      </kbd>
    </button>
  );
}
