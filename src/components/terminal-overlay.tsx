import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { profile } from "../config";
import { banner, commandNames, runCommand } from "../../shared/commands";

/* The same bytes `curl junaadh.dev` returns, rendered in the page. Only the
   escapes the ANSI layer actually emits are handled — SGR reset, bold, and
   truecolor foreground — so this is a few lines rather than a VT parser. */
type Style = { colour?: string; bold?: boolean };

function ansiToNodes(text: string, seed: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  // eslint-disable-next-line no-control-regex -- matching ESC is the point
  const pattern = /\x1b\[([0-9;]*)m/g;
  let style: Style = {};
  let at = 0;
  let key = 0;

  const push = (chunk: string, current: Style) => {
    if (!chunk) return;
    nodes.push(
      <span
        key={`${seed}-${key++}`}
        style={{
          color: current.colour,
          fontWeight: current.bold ? 600 : undefined,
        }}
      >
        {chunk}
      </span>,
    );
  };

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    push(text.slice(at, match.index), style);
    at = match.index + match[0].length;
    const codes = match[1].split(";").map(Number);
    if (codes[0] === 0) style = {};
    else if (codes[0] === 1) style = { ...style, bold: true };
    else if (codes[0] === 38 && codes[1] === 2)
      style = { ...style, colour: `rgb(${codes[2]} ${codes[3]} ${codes[4]})` };
  }
  push(text.slice(at), style);
  return nodes;
}

type Line = { id: number; text: string };

/**
 * A playable terminal, not an emulator. It runs `shared/commands.ts`, which is
 * pure and host-agnostic — the same module could back a real SSH server without
 * being rewritten. There is no shell underneath, so there is nothing to escape
 * from: unknown input just prints "not found".
 */
export default function TerminalOverlay() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const field = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  const nextId = useRef(0);

  const write = useCallback((text: string) => {
    setLines((current) => [...current, { id: nextId.current++, text }]);
  }, []);

  const submit = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      write(`\x1b[38;2;197;246;106m❯\x1b[0m ${line}\n`);
      setInput("");
      if (line) {
        setHistory((h) => [line, ...h].slice(0, 50));
        setCursor(-1);
      }
      if (!line) return;

      // `cv` is the one command whose body lives on the server.
      if (line.toLowerCase() === "cv") {
        try {
          const response = await fetch("/cv.txt");
          write(
            response.ok ? await response.text() : "  could not reach /cv.txt\n",
          );
        } catch {
          write("  could not reach /cv.txt\n");
        }
        return;
      }

      const result = runCommand(line, profile);
      if (result.clear) return setLines([]);
      if (result.output) write(result.output);
      if (result.theme)
        window.dispatchEvent(
          new CustomEvent("portfolio-theme-change", { detail: result.theme }),
        );
      if (result.open) window.open(result.open, "_blank", "noreferrer");
      if (result.exit) setOpen(false);
    },
    [write],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "~") return;
      // Never steal the key from somewhere it could legitimately be typed.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")
      )
        return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    const request = () => setOpen(true);
    window.addEventListener("portfolio-terminal-open", request);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("portfolio-terminal-open", request);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    field.current?.focus({ preventScroll: true });
    if (lines.length === 0) write(banner(profile));
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      restore.current?.focus({ preventScroll: true });
    };
  }, [open, lines.length, write]);

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lines]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-bg/60 px-4 py-[6vh] backdrop-blur-[3px] motion-safe:animate-glass-in"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        className="flex max-h-full w-full max-w-[820px] flex-col border border-strong-line bg-surface/80 shadow-[0_28px_80px_#00000047] backdrop-blur-2xl motion-safe:animate-glass-panel"
        onClick={() => field.current?.focus({ preventScroll: true })}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-visual-line px-[14px] py-[10px] font-mono text-[11px] text-muted">
          <span>
            <span className="text-accent">$</span> ssh junaadh.dev
            <span className="text-faint"> — not really, but close enough</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted transition-colors duration-200 hover:text-accent"
            aria-label="Close"
          >
            esc
          </button>
        </div>

        <div
          ref={scroll}
          className="min-h-0 flex-1 overflow-auto px-[14px] py-3 font-mono text-[12px] leading-[1.55]"
        >
          <pre className="whitespace-pre-wrap text-fg" aria-live="polite">
            {lines.map((line) => ansiToNodes(line.text, line.id))}
          </pre>
        </div>

        <form
          className="flex shrink-0 items-center gap-2 border-t border-visual-line px-[14px] py-[10px] font-mono text-[12px]"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <span className="text-accent" aria-hidden="true">
            ❯
          </span>
          <input
            ref={field}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") return setOpen(false);
              if (event.key === "Tab") {
                event.preventDefault();
                const match = commandNames.find((name) =>
                  name.startsWith(input.trim().toLowerCase()),
                );
                if (match && input.trim()) setInput(match + " ");
                return;
              }
              // Shell-style history, newest first.
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                if (!history.length) return;
                event.preventDefault();
                const next =
                  event.key === "ArrowUp"
                    ? Math.min(cursor + 1, history.length - 1)
                    : cursor - 1;
                setCursor(next);
                setInput(next < 0 ? "" : history[next]);
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal input"
            className="w-full border-0 bg-transparent text-fg outline-none placeholder:text-faint"
            placeholder="help"
          />
        </form>
      </div>
    </div>
  );
}
