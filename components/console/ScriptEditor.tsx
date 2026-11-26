"use client";

import { type KeyboardEvent, type Ref, useId, useRef } from "react";
import { Runs, useHighlight } from "./useHighlight";

const textMetrics = "px-3 py-3 font-mono text-xs leading-5 whitespace-pre";

/**
 * The Eitri editor: a transparent textarea over a highlighted copy of its
 * text, with a line-number gutter. Tab inserts four spaces (Ctrl+M switches
 * Tab to moving focus), and Cmd/Ctrl+Enter calls onRun.
 */
export function ScriptEditor({
  value,
  onChange,
  onRun,
  onTabMode,
  label = "Eitri script",
  textareaRef,
  className = "",
}: {
  value: string;
  onChange: (text: string) => void;
  onRun?: () => void;
  /** Told when Ctrl+M toggles whether Tab moves focus. */
  onTabMode?: (tabMovesFocus: boolean) => void;
  label?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  className?: string;
}) {
  const id = useId();
  const gutter = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLPreElement>(null);
  const tabFocus = useRef(false); // Ctrl+M: let Tab leave the editor
  const runs = useHighlight(value);
  const lines = value.split("\n").length;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onRun) {
      e.preventDefault();
      onRun();
    } else if (e.key.toLowerCase() === "m" && e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      tabFocus.current = !tabFocus.current;
      onTabMode?.(tabFocus.current);
    } else if (e.key === "Tab" && !e.shiftKey && !tabFocus.current) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = ta;
      onChange(`${value.slice(0, s)}    ${value.slice(end)}`);
      requestAnimationFrame(() => ta.setSelectionRange(s + 4, s + 4));
    }
  };

  return (
    <div className={`relative flex min-h-0 border border-line bg-void/60 ${className}`}>
      <div
        ref={gutter}
        aria-hidden="true"
        className="overflow-hidden border-r border-line px-2 py-3 text-right font-mono text-xs leading-5 whitespace-pre text-ink-3 select-none"
      >
        {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
        {"\n\n"}
      </div>
      <div className="relative min-w-0 flex-1">
        {runs && (
          <pre
            ref={layer}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 m-0 overflow-hidden text-ink ${textMetrics}`}
          >
            <code>
              <Runs runs={runs} />
              {"\n"}
            </code>
          </pre>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            const ta = e.currentTarget;
            if (gutter.current) gutter.current.scrollTop = ta.scrollTop;
            if (layer.current) {
              layer.current.scrollTop = ta.scrollTop;
              layer.current.scrollLeft = ta.scrollLeft;
            }
          }}
          aria-label={label}
          aria-describedby={`${id}-hint`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          className={`absolute inset-0 size-full resize-none overflow-auto bg-transparent focus-visible:outline-offset-[-3px] ${textMetrics}${runs ? " text-transparent caret-ink" : " text-ink"}`}
        />
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Tab inserts four spaces. Press Control M to make Tab move focus instead.
      </p>
    </div>
  );
}
