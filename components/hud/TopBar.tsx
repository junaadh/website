import Link from "next/link";
import { Clock } from "./Clock";

const LINKS = [
  { href: "/#work", label: "Work" },
  { href: "/#log", label: "Log" },
  { href: "/#contact", label: "Contact" },
];

export function TopBar({ handle }: { handle: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/70 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5"
      >
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center border border-line-strong font-mono text-xs text-signal transition-colors group-hover:bg-signal group-hover:text-void"
          >
            J
          </span>
          <span className="label hidden text-ink sm:inline">{handle}</span>
        </Link>
        <ul className="flex items-center">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="label flex h-14 items-center px-3 transition-colors hover:text-signal"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="label hidden items-center gap-2 md:flex">
          <span
            aria-hidden="true"
            className="size-1.5 animate-pulse-dot rounded-full bg-ok text-ok"
          />
          MLE <Clock /> UTC+5
        </div>
      </nav>
    </header>
  );
}
