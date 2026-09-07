import { useEffect, useMemo, useRef, useState } from "react";
import { profile } from "../config";
import { copyText } from "./copy-text";
import { fuzzy, segments } from "./fuzzy";

type Action = {
  id: string;
  label: string;
  hint: string;
  keywords?: string;
  run: () => void;
};

const go = (hash: string) => () => {
  document.getElementById(hash)?.scrollIntoView({ block: "start" });
  history.replaceState(null, "", `#${hash}`);
};
const openUrl = (url: string) => () => window.open(url, "_blank", "noreferrer");
const setTheme = (value: string) => () =>
  window.dispatchEvent(
    new CustomEvent("portfolio-theme-change", { detail: value }),
  );

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  const actions = useMemo<Action[]>(
    () => [
      { id: "top", label: "Back to top", hint: "jump", run: go("main") },
      {
        id: "terminal",
        label: "Open terminal view",
        hint: "view",
        keywords: "curl ansi shell console",
        run: () =>
          window.dispatchEvent(new Event("portfolio-terminal-open")),
      },
      { id: "work", label: "Selected work", hint: "jump", run: go("work") },
      {
        id: "experience",
        label: "Experience",
        hint: "jump",
        run: go("experience"),
      },
      { id: "about", label: "About", hint: "jump", run: go("about") },
      { id: "contact", label: "Contact", hint: "jump", run: go("contact") },
      {
        id: "copy-email",
        label: `Copy email — ${profile.email}`,
        hint: "copy",
        keywords: "mail address contact",
        run: async () => {
          setFlash((await copyText(profile.email)) ? "copied" : "failed");
        },
      },
      {
        id: "cv",
        label: "Open résumé (PDF)",
        hint: "open",
        keywords: "cv resume download",
        run: openUrl("/cv.pdf?v=typst-1"),
      },
      {
        id: "github",
        label: "GitHub",
        hint: "open",
        keywords: "repositories code source",
        run: openUrl(profile.github),
      },
      {
        id: "x",
        label: "X / Twitter",
        hint: "open",
        run: openUrl(`https://x.com/${profile.handle}`),
      },
      ...(["auto", "light", "dark"] as const).map((value) => ({
        id: `theme-${value}`,
        label: `Theme: ${value[0].toUpperCase()}${value.slice(1)}`,
        hint: "theme",
        keywords: "appearance colour color",
        run: setTheme(value),
      })),
      ...profile.projects.map((project) => ({
        id: `project-${project.name}`,
        label: project.name,
        hint: "project",
        keywords: `${project.category} ${project.tags.join(" ")}`,
        run: openUrl(project.url),
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle)
      return actions.map((action) => ({ action, positions: [] as number[] }));
    return actions
      .flatMap((action) => {
        const direct = fuzzy(needle, action.label);
        if (direct)
          return [{ action, positions: direct.positions, score: direct.score }];
        // Keywords still match, but rank below anything hit in the label.
        const aside = fuzzy(needle, `${action.hint} ${action.keywords ?? ""}`);
        return aside
          ? [{ action, positions: [] as number[], score: aside.score - 60 }]
          : [];
      })
      .sort((a, b) => b.score - a.score);
  }, [actions, query]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const request = () => setOpen(true);
    document.addEventListener("keydown", shortcut);
    window.addEventListener("portfolio-command-open", request);
    return () => {
      document.removeEventListener("keydown", shortcut);
      window.removeEventListener("portfolio-command-open", request);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    setQuery("");
    setIndex(0);
    setFlash("");
    input.current?.focus({ preventScroll: true });
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      restore.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const choose = (action: Action | undefined) => {
    if (!action) return;
    // Copy reports inline; everything else has served its purpose on close.
    if (action.id === "copy-email") return void action.run();
    setOpen(false);
    // Wait for the overlay to unmount so the scroll lock is off before jumping.
    requestAnimationFrame(() => requestAnimationFrame(action.run));
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-bg/40 px-4 pt-[13vh] backdrop-blur-[3px] motion-safe:animate-glass-in max-md:pt-[8vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      {/* Square, translucent, blurred: a terminal pane floating over the page. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-[560px] border border-strong-line bg-surface/70 font-mono shadow-[0_28px_80px_#00000047] backdrop-blur-2xl backdrop-saturate-150 motion-safe:animate-glass-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") return setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIndex((value) => {
              const next = value + (event.key === "ArrowDown" ? 1 : -1);
              return (next + results.length) % Math.max(1, results.length);
            });
          }
          if (event.key === "Enter") {
            event.preventDefault();
            choose(results[index]?.action);
          }
        }}
      >
        <div className="flex items-center gap-2 px-[14px] pt-[13px]">
          <span className="shrink-0 text-[13px] text-accent" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="jump, open, copy…"
            aria-label="Search commands"
            spellCheck={false}
            autoComplete="off"
            className="w-full border-0 bg-transparent text-[13px] text-fg outline-none placeholder:text-faint"
          />
        </div>
        <div
          className="px-[14px] pt-[6px] pb-[10px] text-[11px] text-faint"
          aria-live="polite"
        >
          <span className="text-muted">{results.length}</span>/{actions.length}
        </div>
        <ul
          ref={list}
          role="listbox"
          className="max-h-[44vh] overflow-y-auto border-t border-visual-line py-1"
        >
          {results.map(({ action, positions }, position) => (
            <li key={action.id}>
              <button
                type="button"
                role="option"
                aria-selected={position === index}
                onPointerEnter={() => setIndex(position)}
                onClick={() => choose(action)}
                className={`flex w-full items-center justify-between gap-4 border-l-2 py-[7px] pr-[14px] pl-[10px] text-left text-[13px] transition-colors duration-100 ${
                  position === index
                    ? "border-accent bg-accent/10 text-fg"
                    : "border-transparent text-secondary hover:bg-visual-bg/50"
                }`}
              >
                <span className="truncate">
                  <span
                    className={
                      position === index ? "text-accent" : "text-faint"
                    }
                    aria-hidden="true"
                  >
                    {position === index ? "▸ " : "  "}
                  </span>
                  {segments(action.label, positions).map((run, at) =>
                    run.on ? (
                      <span
                        key={at}
                        className="text-accent underline underline-offset-2"
                      >
                        {run.text}
                      </span>
                    ) : (
                      <span key={at}>{run.text}</span>
                    ),
                  )}
                </span>
                <span className="shrink-0 text-[10px] tracking-[1px] text-muted">
                  {action.id === "copy-email" && flash ? flash : action.hint}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-[14px] py-6 text-[12px] text-faint">
              no matches for “{query}”
            </li>
          )}
        </ul>
        <div className="border-t border-visual-line px-[14px] py-[9px] text-[10px] tracking-[0.5px] text-faint">
          <span className="text-muted">↑↓</span> move{" "}
          <span className="text-muted">⏎</span> run{" "}
          <span className="text-muted">esc</span> close
        </div>
      </div>
    </div>
  );
}
