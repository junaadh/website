"use client";

import { Runs, useHighlight } from "./useHighlight";

// Read-only Eitri source: highlighted once the grammar has loaded, plain before.
export function CodeView({ text, className = "" }: { text: string; className?: string }) {
  const runs = useHighlight(text);
  return (
    <pre className={`font-mono text-xs leading-5 whitespace-pre text-ink-2 ${className}`}>
      <code>{runs ? <Runs runs={runs} /> : text}</code>
    </pre>
  );
}
