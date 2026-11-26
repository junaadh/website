"use client";

import { useEffect } from "react";

export interface Toast {
  id: number;
  text: string;
}

const LIFETIME_MS = 5000;

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), LIFETIME_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <li className="hud pointer-events-auto flex items-start gap-3 bg-void/90 py-3 pr-2 pl-4 backdrop-blur-md">
      <span aria-hidden="true" className="label mt-0.5 text-signal">
        {"//"}
      </span>
      <span className="flex-1 font-mono text-xs leading-relaxed text-ink">{toast.text}</span>
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

// The live region is always mounted so assistive tech registers it before
// the first toast arrives. "lifted" keeps toasts clear of the open console.
export function ToastStack({
  toasts,
  dismiss,
  lifted,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
  lifted: boolean;
}) {
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
