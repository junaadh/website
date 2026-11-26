"use client";

import { useEffect, useMemo, useState } from "react";
import { type HighlightDoc, loadHighlighter, type Run } from "@/lib/eitri/highlight";

/**
 * Highlighted runs for text, or null until the highlighter has loaded (callers
 * show plain text meanwhile). Each hook owns one parse tree, so edits re-parse
 * incrementally. The grammar and queries are fetched on first use only.
 */
export function useHighlight(text: string): Run[] | null {
  const [doc, setDoc] = useState<HighlightDoc | null>(null);

  useEffect(() => {
    let live = true;
    let mine: HighlightDoc | null = null;
    loadHighlighter()
      .then((h) => {
        if (!live) return;
        mine = h.doc();
        setDoc(mine);
      })
      .catch(() => {}); // stays plain text
    return () => {
      live = false;
      mine?.dispose();
    };
  }, []);

  return useMemo(() => {
    if (!doc) return null;
    try {
      return doc.update(text);
    } catch {
      return null;
    }
  }, [doc, text]);
}

export function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r) =>
        r.cls ? (
          <span key={r.at} className={r.cls}>
            {r.text}
          </span>
        ) : (
          <span key={r.at}>{r.text}</span>
        ),
      )}
    </>
  );
}
