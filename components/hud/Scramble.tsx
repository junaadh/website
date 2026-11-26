"use client";

import { useEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";

// Decodes text from random glyphs on mount. Server HTML and screen readers
// always get the real text; the animation is skipped under reduced motion.
export function Scramble({ text, duration = 900 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
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
  }, [text, duration]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
