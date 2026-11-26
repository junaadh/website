import Link from "next/link";
import type { ReactNode } from "react";
import { neighbours } from "@/lib/docs/nav";

/** The page title block, in the same style as /card: a tag, the path, the title and a lead. */
export function DocHeader({
  tag = "DOCS",
  path,
  title,
  children,
}: {
  tag?: string;
  path: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="label mb-5 flex flex-wrap items-center gap-x-3">
        <span className="text-signal">[ {tag} ]</span> <span className="normal-case">{path}</span>
      </p>
      <h1>{title}</h1>
      {children && <div className="text-base text-ink-2 [&>p]:mb-0">{children}</div>}
    </header>
  );
}

export function H2({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id}>
      {title}
      <a className="anchor" href={`#${id}`} aria-label={`Link to ${title}`}>
        #
      </a>
    </h2>
  );
}

export function H3({ id, title }: { id: string; title: string }) {
  return (
    <h3 id={id}>
      {title}
      <a className="anchor" href={`#${id}`} aria-label={`Link to ${title}`}>
        #
      </a>
    </h3>
  );
}

export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="callout" data-kind={kind}>
      <span className="label">{title ?? (kind === "warn" ? "Warning" : "Note")}</span>
      {children}
    </aside>
  );
}

/** Anchors for the headings of a long page. */
export function OnThisPage({ items }: { items: { id: string; title: string }[] }) {
  return (
    <nav aria-label="On this page" className="hud wide mb-8 p-4">
      <p className="label mb-3 text-signal">On this page</p>
      <ul className="toc flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`}>{i.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Previous and next page, in reading order. */
export function Pager({ href }: { href: string }) {
  const { prev, next } = neighbours(href);
  const card = "hud hud-hover plain block p-4 transition-colors";
  return (
    <nav aria-label="More documentation" className="wide mt-16 grid gap-4 @2xl:grid-cols-2">
      {prev ? (
        <Link href={prev.href} rel="prev" className={card}>
          <span className="label block">Previous</span>
          <span className="mt-1 block text-ink">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} rel="next" className={`${card} @2xl:text-right`}>
          <span className="label block">Next</span>
          <span className="mt-1 block text-ink">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
