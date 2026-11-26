import Link from "next/link";
import { code, type Project } from "@/lib/profile";
import { StatusDot } from "./StatusDot";

export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Link href={`/work/${p.slug}/`} className="hud hud-hover group flex h-full flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <span className="label text-signal">{code(p)}</span>
        <StatusDot status={p.status} />
      </div>
      <div>
        <p className="label mb-2">{p.kind}</p>
        <h3 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-signal">
          {p.name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{p.summary}</p>
      </div>
      <div className="mt-auto flex items-end justify-between gap-4 pt-2">
        <ul className="flex flex-wrap gap-1.5">
          {p.stack.map((s) => (
            <li key={s} className="label border border-line px-2 py-1 text-[0.625rem]">
              {s}
            </li>
          ))}
        </ul>
        <span
          aria-hidden="true"
          className="label shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-signal"
        >
          Open →
        </span>
      </div>
    </Link>
  );
}
