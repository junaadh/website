"use client";

import type { ReactNode } from "react";
import { useContent, useEngine } from "./engine-context";

export interface WorkItem {
  slug: string;
  /** Rendered on the server, so the default grid ships as complete static HTML. */
  node: ReactNode;
}

export function WorkGrid({ items }: { items: WorkItem[] }) {
  const engine = useEngine();
  const { order, hidden, highlighted, badges } = useContent();

  const rank = (slug: string) => {
    const i = order.indexOf(slug);
    return i === -1 ? order.length : i;
  };
  // Array.sort is stable: unlisted projects keep their original order.
  const shown = [...items]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .filter((i) => !hidden.includes(i.slug));

  const at = (e: { clientX: number; clientY: number }) => ({
    x: e.clientX / Math.max(1, window.innerWidth),
    y: e.clientY / Math.max(1, window.innerHeight),
  });

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {shown.map((item) => {
        const lit = highlighted.includes(item.slug);
        const tags = badges[item.slug] ?? [];
        return (
          // Hover and click are events for scripts; they never stop navigation.
          <li
            key={item.slug}
            data-project={item.slug}
            data-lit={lit ? "true" : undefined}
            className="relative"
            onPointerEnter={(e) => engine.emit("project.hover", { slug: item.slug, ...at(e) })}
            onPointerLeave={(e) => engine.emit("project.leave", { slug: item.slug, ...at(e) })}
            onClickCapture={(e) => engine.emit("project.click", { slug: item.slug, ...at(e) })}
          >
            {lit && <span className="sr-only">Highlighted project.</span>}
            {tags.length > 0 && (
              <ul
                aria-label="Tags"
                className="pointer-events-none absolute -top-2 left-6 z-10 flex gap-1.5"
              >
                {tags.map((t) => (
                  <li
                    key={t}
                    className="label chamfer bg-signal px-2 py-0.5 text-[0.625rem] font-medium text-void"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {item.node}
          </li>
        );
      })}
      {shown.length === 0 && (
        <li className="label col-span-full border border-line p-6">
          Every project is hidden by your script.
        </li>
      )}
    </ul>
  );
}
