"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import type { NavGroup } from "@/lib/docs/nav";

const clean = (path: string) => (path.endsWith("/") ? path : `${path}/`);

function Groups({
  groups,
  current,
  onNavigate,
}: {
  groups: NavGroup[];
  current: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-5">
      {groups.map((g) => (
        <li key={g.title}>
          <p className="label mb-2 text-signal">{g.title}</p>
          <ul className="border-l border-line">
            {g.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={`-ml-px block border-l py-1.5 pl-3 text-sm transition-colors hover:text-signal ${
                      item.mono ? "font-mono text-xs" : ""
                    } ${active ? "border-signal text-signal" : "border-transparent text-ink-2"}`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/**
 * The docs sidebar: sticky beside the page when <main> is wide enough, a
 * collapsible menu above it otherwise. Both are in the page; CSS picks one.
 */
export function DocsNav({ groups }: { groups: NavGroup[] }) {
  const current = clean(usePathname());
  const menu = useRef<HTMLDetailsElement>(null);
  const here =
    groups.flatMap((g) => g.items).find((i) => i.href === current)?.title ?? "Documentation";
  return (
    <>
      <details ref={menu} className="hud group @4xl:hidden">
        <summary className="label flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
          <span>
            Docs menu <span className="text-signal">{`// ${here}`}</span>
          </span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-90">
            &gt;
          </span>
        </summary>
        <nav aria-label="Documentation" className="border-t border-line px-4 py-4">
          <Groups
            groups={groups}
            current={current}
            onNavigate={() => menu.current?.removeAttribute("open")}
          />
        </nav>
      </details>
      <nav
        aria-label="Documentation"
        className="hidden max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2 @4xl:sticky @4xl:top-20 @4xl:block @4xl:self-start"
      >
        <Groups groups={groups} current={current} />
      </nav>
    </>
  );
}
