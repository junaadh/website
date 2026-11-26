"use client";

import { useState } from "react";
import { useEngineState } from "./engine-context";

// A ticker under the top bar (ui.banner). The visual marquee is hidden from
// assistive tech; one polite live region announces the text instead. It
// stops on hover, and under reduced motion it is a still, truncated line.
export function Banner() {
  const banner = useEngineState((s) => s.content.banner);
  const [dismissed, setDismissed] = useState("");
  const shown = banner !== "" && dismissed !== banner;

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {banner}
      </p>
      {shown && (
        <div
          data-banner
          className="sticky top-14 z-30 border-b border-line bg-void/80 backdrop-blur-md"
        >
          <div className="mx-auto flex h-9 max-w-6xl items-center gap-4 px-5">
            <span aria-hidden="true" className="label shrink-0 text-signal">
              [ Bcast ]
            </span>
            <div aria-hidden="true" className="banner-track min-w-0 flex-1 overflow-hidden">
              <div
                className="banner-run flex w-max font-mono text-xs text-ink-2"
                style={{ animationDuration: `${Math.max(12, banner.length * 0.3)}s` }}
              >
                <span className="pr-16 whitespace-nowrap">{banner}</span>
                <span className="banner-copy pr-16 whitespace-nowrap">{banner}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(banner)}
              aria-label="Dismiss banner"
              className="label shrink-0 px-2 transition-colors hover:text-signal"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
