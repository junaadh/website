"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tone } from "@/lib/eitri/model";
import { useEngine } from "./engine-context";

export interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const LIFETIME_MS = 5000;
const TONE: Record<Tone, { glyph: string; cls: string; label: string }> = {
  info: { glyph: "//", cls: "text-signal", label: "" },
  ok: { glyph: "OK", cls: "text-ok", label: "Success: " },
  warn: { glyph: "!!", cls: "text-warn", label: "Warning: " },
  error: { glyph: "XX", cls: "text-err", label: "Error: " },
};

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), toast.tone === "error" ? 8000 : LIFETIME_MS);
    return () => clearTimeout(t);
  }, [toast.id, toast.tone, dismiss]);
  const tone = TONE[toast.tone];

  return (
    <li className="hud pointer-events-auto flex items-start gap-3 bg-void/90 py-3 pr-2 pl-4 backdrop-blur-md">
      <span aria-hidden="true" className={`label mt-0.5 ${tone.cls}`}>
        {tone.glyph}
      </span>
      <span className="flex-1 font-mono text-xs leading-relaxed text-ink">
        {tone.label && <span className="sr-only">{tone.label}</span>}
        {toast.text}
      </span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="label px-2 py-0.5 transition-colors hover:text-signal"
      >
        ✕
      </button>
    </li>
  );
}

let toastId = 0;

// The live region is always mounted so assistive tech registers it before
// the first toast arrives. "lifted" keeps toasts clear of the open console.
export function ToastHost({ lifted }: { lifted: boolean }) {
  const engine = useEngine();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(
    () =>
      engine.onCommand((c) => {
        if (c.t === "toast") {
          setToasts((t) => [...t.slice(-3), { id: ++toastId, text: c.text, tone: c.tone }]);
        }
      }),
    [engine],
  );

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={`pointer-events-none fixed right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] ${
        lifted ? "bottom-[calc(min(70dvh,34rem)+1.5rem)]" : "bottom-4"
      }`}
    >
      <ul className="flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} dismiss={dismiss} />
        ))}
      </ul>
    </div>
  );
}
