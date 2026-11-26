"use client";

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- the snippet boxes scroll, so they must be keyboard reachable */

import { useState } from "react";
import { useEngine } from "@/components/console/engine-context";

const btn =
  "label shrink-0 border border-line-strong px-3 py-1.5 transition-colors hover:border-signal hover:text-signal disabled:opacity-50";

function Snippet({ label, text }: { label: string; text: string }) {
  const engine = useEngine();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      engine.toast("Could not copy", "warn");
    }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="label">{label}</span>
        <button type="button" onClick={copy} className={btn} aria-label={`Copy ${label}`}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard reachable
        tabIndex={0}
        className="max-h-28 overflow-auto border border-line bg-void/60 p-2.5 font-mono text-xs leading-5 break-all whitespace-pre-wrap text-ink-2"
      >
        {text}
      </pre>
    </div>
  );
}

export function EmbedPanel({
  url,
  svg,
  login,
  note,
  long,
  saving,
  onShorten,
}: {
  /** The public SVG URL, or null while the script is being encoded. */
  url: string | null;
  svg: string;
  login: string;
  note: string | null;
  /** The URL carries the whole script; offer to save it for a short link. */
  long: boolean;
  saving: boolean;
  onShorten: () => void;
}) {
  const download = () => {
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `${login || "github"}-card.svg`;
    a.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="hud flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="label text-signal">{"EMBED // LINKS"}</h3>
        <button type="button" onClick={download} disabled={!svg} className={btn}>
          Download SVG
        </button>
      </div>
      {note && <p className="text-xs text-warn">{note}</p>}
      {long && url && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line p-3">
          <p className="text-xs text-ink-2">
            This link carries the whole script. Save it to get a short one.
          </p>
          <button type="button" onClick={onShorten} disabled={saving} className={btn}>
            {saving ? "Saving…" : "Save · short link"}
          </button>
        </div>
      )}
      {url ? (
        <>
          <Snippet label="SVG URL" text={url} />
          <Snippet label="Markdown" text={`![GitHub card](${url})`} />
          <Snippet
            label="HTML"
            text={`<img src="${url.replaceAll("&", "&amp;")}" alt="GitHub card">`}
          />
        </>
      ) : (
        <p className="text-xs text-ink-3">…</p>
      )}
    </div>
  );
}
