"use client";

import { useId } from "react";

export interface ParamRow {
  id: number;
  key: string;
  value: string;
}

const MAX_ROWS = 16;
const field = "control";

// Key/value rows, handed to the script as card.param(name, fallback).
export function ParamsEditor({
  rows,
  onChange,
}: {
  rows: ParamRow[];
  onChange: (rows: ParamRow[]) => void;
}) {
  const id = useId();
  const set = (rowId: number, patch: Partial<ParamRow>) =>
    onChange(rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  const nextId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="label mb-2">Params · card.param(name, fallback)</legend>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex gap-2">
            <input
              aria-label={`Parameter ${i + 1} name`}
              value={r.key}
              onChange={(e) => set(r.id, { key: e.target.value })}
              placeholder="theme"
              maxLength={32}
              spellCheck={false}
              autoComplete="off"
              className={`${field} w-2/5`}
            />
            <input
              aria-label={`Parameter ${i + 1} value`}
              value={r.value}
              onChange={(e) => set(r.id, { value: e.target.value })}
              placeholder="dark"
              maxLength={100}
              spellCheck={false}
              autoComplete="off"
              className={`${field} flex-1`}
            />
            <button
              type="button"
              aria-label={`Remove parameter ${i + 1}`}
              onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
              className="label border border-line-strong px-2.5 transition-colors hover:border-err hover:text-err"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        id={`${id}-add`}
        disabled={rows.length >= MAX_ROWS}
        onClick={() => onChange([...rows, { id: nextId, key: "", value: "" }])}
        className="label mt-2 border border-line-strong px-3 py-1.5 transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
      >
        + Add param
      </button>
    </fieldset>
  );
}
