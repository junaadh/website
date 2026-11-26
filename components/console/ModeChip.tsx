"use client";

import { useEngineState } from "./engine-context";

// The active key mode, bottom-left, like a modal editor's status line.
export function ModeChip() {
  const mode = useEngineState((s) => s.mode);
  return (
    <output aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[55]">
      {mode && (
        <p className="hud flex items-center gap-2 bg-void/90 px-3 py-2 backdrop-blur-md">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse-dot rounded-full bg-signal text-signal"
          />
          <span className="label text-signal">Mode: {mode}</span>
          <span className="label hidden sm:inline">Esc leaves</span>
        </p>
      )}
    </output>
  );
}
