"use client";

import { useContent } from "./engine-context";

// The SYS.READOUT panel. The default rows are server-rendered; a script's
// readout() rows are appended, and one whose label matches a default replaces it.
export function ReadoutPanel({ rows }: { rows: [string, string][] }) {
  const { readouts } = useContent();
  const key = (s: string) => s.toLowerCase();
  const overrides = new Map(readouts.map((r) => [key(r.label), r.value]));
  const base = new Set(rows.map(([k]) => key(k)));
  const all: [string, string][] = [
    ...rows.map(([k, v]): [string, string] => [k, overrides.get(key(k)) ?? v]),
    ...readouts
      .filter((r) => !base.has(key(r.label)))
      .map((r): [string, string] => [r.label, r.value]),
  ];

  return (
    <dl className="hud p-5">
      <p className="label mb-4 flex items-center justify-between border-b border-line pb-3">
        <span className="text-signal">Sys.readout</span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse-dot rounded-full bg-ok text-ok"
          />
          Online
        </span>
      </p>
      {all.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-1.5">
          <dt className="label">{k}</dt>
          <dd className="text-right font-mono text-xs text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
