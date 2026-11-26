"use client";

import {
  type KeyboardEvent,
  type Ref,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
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
  const layer = useRef<HTMLElement>(null);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const tabFocus = useRef(false); // Ctrl+M: let Tab leave the editor
  const runs = useHighlight(value);
  const lines = value.split("\n").length;

  // The highlight layer and gutter follow the textarea by translation, not by
  // scrollTop/scrollLeft: their own scroll range is clamped differently (the
  // textarea loses room to its scrollbars), so copying scroll offsets drifts
  // apart near the bottom or right edge.
  const sync = useCallback(() => {
    const ta = area.current;
    if (!ta) return;
    if (gutter.current) gutter.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (layer.current)
      layer.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
  }, []);
  // Edits can scroll the textarea, and the layer mounts after the highlighter loads.
  useLayoutEffect(sync);
  useImperativeHandle(textareaRef, () => area.current as HTMLTextAreaElement, []);

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
        aria-hidden="true"
        className="overflow-hidden border-r border-line px-2 py-3 text-right font-mono text-xs leading-5 whitespace-pre text-ink-3 select-none"
      >
        <div ref={gutter} className="will-change-transform">
          {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        {runs && (
          <pre
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 m-0 overflow-hidden text-ink ${textMetrics}`}
          >
            <code ref={layer} className="block w-max will-change-transform">
              <Runs runs={runs} />
              {"\n"}
            </code>
          </pre>
        )}
        <textarea
          ref={area}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={sync}
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
