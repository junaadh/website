"use client";

import { useEffect, useState } from "react";
import { useEngineState } from "@/components/console/engine-context";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";

// Decodes text from random glyphs. Server HTML and screen readers always get
// the real text; the animation is skipped under reduced motion.
//  - initial: also decode once on mount (the hero name does, headings do not).
//  - fx.decode() from a script bumps the engine's counter and decodes again.
export function Scramble({
  text,
  duration = 900,
  initial = true,
}: {
  text: string;
  duration?: number;
  initial?: boolean;
}) {
  const [shown, setShown] = useState(text);
  const decode = useEngineState((s) => s.decode);

  useEffect(() => {
    if (!initial && decode === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const done = Math.min(1, (now - start) / duration);
      const settled = Math.floor(done * text.length);
      setShown(
        [...text]
          .map((ch, i) =>
            i < settled || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(""),
      );
      if (done < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration, initial, decode]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
