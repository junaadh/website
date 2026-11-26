"use client";

import { useEffect, useState } from "react";
import { useEngineState } from "./engine-context";

// fx.typeout: a line typed under the hero intro. A new line replaces the old.
export function HeroTypeout() {
  const typeout = useEngineState((s) => s.typeout);
  if (!typeout) return null;
  return <Typed key={typeout.nonce} text={typeout.text} />;
}

function Typed({ text }: { text: string }) {
  const chars = [...text];
  const [n, setN] = useState(0);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setN((i) => (i >= chars.length ? i : i + 1)), 35);
    return () => clearInterval(t);
  }, [reduced, chars.length]);

  const shown = reduced ? chars.length : n;
  return (
    <p className="mt-5 flex items-center gap-3 font-mono text-sm text-signal">
      <span aria-hidden="true" className="text-ink-3">
        &gt;
      </span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={shown < chars.length ? "caret" : ""}>
        {chars.slice(0, shown).join("")}
      </span>
    </p>
  );
}
