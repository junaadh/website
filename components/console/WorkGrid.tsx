"use client";

import type { ReactNode } from "react";
import { useSiteState } from "./SiteProvider";

export interface WorkItem {
  slug: string;
  /** Rendered on the server, so the default grid ships as complete static HTML. */
  node: ReactNode;
}

export function WorkGrid({ items }: { items: WorkItem[] }) {
  const { order, hidden, highlighted } = useSiteState();

  const rank = (slug: string) => {
    const i = order.indexOf(slug);
    return i === -1 ? order.length : i;
  };
  // Array.sort is stable: unlisted projects keep their original order.
  const shown = [...items]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .filter((i) => !hidden.includes(i.slug));

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {shown.map((item) => {
        const lit = highlighted.includes(item.slug);
        return (
          <li key={item.slug} data-lit={lit ? "true" : undefined}>
            {lit && <span className="sr-only">Highlighted project.</span>}
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
