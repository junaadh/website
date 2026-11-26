"use client";

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- the sample scrolls sideways, so it must be keyboard reachable */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CodeView } from "@/components/console/CodeView";
import { useEngine } from "@/components/console/engine-context";

const btn =
  "label shrink-0 border border-line-strong px-2.5 py-1 transition-colors hover:border-signal hover:text-signal";
const pre = "font-mono text-xs leading-5 whitespace-pre text-ink-2";

/**
 * A code sample. Eitri is highlighted with the console's tree-sitter grammar,
 * which is only fetched once a sample is near the viewport; until then (and
 * when scripts are off) the plain text is shown, so nothing shifts.
 */
export function CodeBlock({
  code,
  label = "eitri",
  language = "eitri",
  tone,
  run = false,
  studioHref,
}: {
  code: string;
  label?: string;
  /** "text" is shown as it is: shell, HTTP, JSON, diagnostics. */
  language?: "eitri" | "text";
  tone?: "err";
  /** Offer "Run in console": load this script into the console. */
  run?: boolean;
  /** Offer "Open in card studio" with this link. */
  studioHref?: string;
}) {
  const engine = useEngine();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (language !== "eitri" || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [language]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      engine.toast("Could not copy", "warn");
    }
  };

  const load = () => {
    engine.setScript(code);
    engine.openConsole();
    engine.toast("Script loaded. Press Run in the console.");
  };

  return (
    <figure className="hud my-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-2">
        <figcaption className={`label ${tone === "err" ? "text-err" : ""}`}>{label}</figcaption>
        <div className="flex flex-wrap gap-2">
          {run && (
            <button
              type="button"
              onClick={load}
              className={btn}
              title="Loads the script into the console; press Run there"
            >
              Run in console
            </button>
          )}
          {studioHref && (
            <Link href={studioHref} className={btn}>
              Open in card studio
            </Link>
          )}
          <button type="button" onClick={copy} className={btn} aria-label={`Copy ${label}`}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <section
        ref={box}
        aria-label={label}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard reachable
        tabIndex={0}
        className="overflow-x-auto p-3"
      >
        {language === "eitri" && near ? (
          <CodeView text={code} />
        ) : (
          <pre className={`${pre} ${tone === "err" ? "text-err" : ""}`}>
            <code>{code}</code>
          </pre>
        )}
      </section>
    </figure>
  );
}
