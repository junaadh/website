import { useState } from "react";
import type { ReactNode } from "react";

/* Building blocks for editing arrays. Reordering is buttons rather than drag:
   it is keyboard reachable, needs no pointer precision, and cannot half-drop. */

const iconButton =
  "grid size-7 shrink-0 place-items-center border border-visual-line text-[12px] text-muted transition-colors duration-200 hover:border-strong-line hover:text-fg disabled:cursor-not-allowed disabled:opacity-30";

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Reorder({
  index,
  length,
  onMove,
  onRemove,
  removeLabel,
}: {
  index: number;
  length: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={iconButton}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === length - 1}
        onClick={() => onMove(index + 1)}
        aria-label="Move down"
      >
        ↓
      </button>
      {/* Two-step: losing a filled-in entry to one stray click is too easy. */}
      {confirming ? (
        <button
          type="button"
          className="h-7 shrink-0 border border-[#d0453f] px-2 text-[11px] text-[#d0453f]"
          onClick={onRemove}
          onBlur={() => setConfirming(false)}
          autoFocus
        >
          Remove?
        </button>
      ) : (
        <button
          type="button"
          className={iconButton}
          onClick={() => setConfirming(true)}
          aria-label={removeLabel}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function StringList({
  label,
  values,
  onChange,
  multiline,
  addLabel = "Add",
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  multiline?: boolean;
  addLabel?: string;
}) {
  const set = (index: number, value: string) =>
    onChange(values.map((item, at) => (at === index ? value : item)));
  const input =
    "w-full border border-visual-line bg-visual-bg px-3 py-2 text-[13px] text-fg outline-none transition-colors duration-200 focus:border-strong-line";
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[1px] text-muted uppercase">
        {label} <span className="text-faint">({values.length})</span>
      </span>
      <div className="flex flex-col gap-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            {multiline ? (
              <textarea
                className={`${input} min-h-[62px] resize-y leading-[1.6]`}
                value={value}
                spellCheck={false}
                onChange={(event) => set(index, event.target.value)}
              />
            ) : (
              <input
                className={input}
                value={value}
                spellCheck={false}
                onChange={(event) => set(index, event.target.value)}
              />
            )}
            <Reorder
              index={index}
              length={values.length}
              onMove={(to) => onChange(move(values, index, to))}
              onRemove={() => onChange(values.filter((_, at) => at !== index))}
              removeLabel={`Remove ${label} ${index + 1}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="self-start border border-visual-line px-3 py-[6px] text-[12px] text-secondary transition-colors duration-200 hover:border-strong-line hover:text-accent"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const unknown = value && !options.includes(value);
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[1px] text-muted uppercase">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none border bg-visual-bg px-3 py-2 text-[13px] text-fg outline-none transition-colors duration-200 focus:border-strong-line ${unknown ? "border-[#d0453f]" : "border-visual-line"}`}
      >
        {/* Surface an out-of-range value rather than silently snapping it. */}
        {unknown && <option value={value}>{value} — unrecognised</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 self-end py-2 text-[13px] text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

/** Collapsible cards for an array of objects, with add/reorder/remove. */
export function ItemList<T>({
  label,
  items,
  onChange,
  create,
  title,
  subtitle,
  children,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T, index: number) => string;
  subtitle?: (item: T) => string;
  children: (item: T, set: (item: T) => void) => ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(items.length ? 0 : null);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="border border-visual-line">
          <div className="flex items-center gap-3 px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(open === index ? null : index)}
              className="flex flex-1 items-center gap-3 text-left"
              aria-expanded={open === index}
            >
              <span
                className={`text-[12px] text-accent transition-transform duration-200 ${open === index ? "rotate-45" : ""}`}
                aria-hidden="true"
              >
                +
              </span>
              <span className="text-[13px] text-fg">
                {title(item, index) || <em className="text-muted">untitled</em>}
              </span>
              {subtitle && (
                <span className="font-mono text-[11px] text-muted">
                  {subtitle(item)}
                </span>
              )}
            </button>
            <Reorder
              index={index}
              length={items.length}
              onMove={(to) => {
                onChange(move(items, index, to));
                setOpen(to);
              }}
              onRemove={() => {
                onChange(items.filter((_, at) => at !== index));
                setOpen(null);
              }}
              removeLabel={`Remove ${label} ${index + 1}`}
            />
          </div>
          {open === index && (
            <div className="flex flex-col gap-4 border-t border-visual-line p-4">
              {children(item, (next) =>
                onChange(items.map((old, at) => (at === index ? next : old))),
              )}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          onChange([...items, create()]);
          setOpen(items.length);
        }}
        className="self-start border border-visual-line px-3 py-2 text-[12px] text-secondary transition-colors duration-200 hover:border-strong-line hover:text-accent"
      >
        + Add {label}
      </button>
    </div>
  );
}
