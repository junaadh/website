// The docs table of contents, in reading order. The SDK modules come from the
// declaration files, so a new file shows up here by itself.

import { sdkModules } from "./sdk";

export interface NavItem {
  href: string;
  title: string;
  /** Shown beside the title in the sidebar (monospace). */
  mono?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function docsNav(): NavGroup[] {
  return [
    { title: "Start", items: [{ href: "/docs/", title: "Overview" }] },
    {
      title: "Console",
      items: [
        { href: "/docs/console/", title: "Console" },
        { href: "/docs/eitri/", title: "Eitri language" },
      ],
    },
    {
      title: "SDK",
      items: [
        { href: "/docs/sdk/", title: "Reference" },
        ...sdkModules().map((m) => ({ href: `/docs/sdk/${m.slug}/`, title: m.path, mono: true })),
      ],
    },
    {
      title: "Card studio",
      items: [
        { href: "/docs/card/", title: "Guide" },
        { href: "/docs/card/api/", title: "HTTP API" },
      ],
    },
  ];
}

/** The page before and after `href` in reading order. */
export function neighbours(href: string): { prev: NavItem | null; next: NavItem | null } {
  const flat = docsNav().flatMap((g) => g.items);
  const at = flat.findIndex((i) => i.href === href);
  return { prev: at > 0 ? (flat[at - 1] ?? null) : null, next: flat[at + 1] ?? null };
}
