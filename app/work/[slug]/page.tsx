import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Scramble } from "@/components/hud/Scramble";
import { StatusDot } from "@/components/hud/StatusDot";
import { bySlug, code, projects } from "@/lib/profile";
import { pageMeta } from "@/lib/seo";

// Static export: every project page is generated at build time, others 404.
export const dynamicParams = false;
export const generateStaticParams = () => projects.map((p) => ({ slug: p.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = bySlug((await params).slug);
  return p
    ? pageMeta({
        title: p.name,
        description: p.summary,
        path: `/work/${p.slug}/`,
        image: `work-${p.slug}`,
      })
    : {};
}

export default async function ProjectPage({ params }: Props) {
  const p = bySlug((await params).slug);
  if (!p) notFound();

  const notes = [
    ["How it works", p.specimen?.internals],
    ["What broke", p.specimen?.broke],
    ["What I learned", p.specimen?.learned],
  ].filter((n): n is [string, string] => Boolean(n[1]));

  const links = [
    p.links.live && { href: p.links.live, label: "Live site", detail: new URL(p.links.live).host },
    p.links.repo && { href: p.links.repo, label: "Source", detail: "GitHub" },
    p.links.writeup && { href: p.links.writeup, label: "Writeup", detail: "Read" },
  ].filter((l): l is { href: string; label: string; detail: string } => Boolean(l));

  return (
    <article className="pt-12 sm:pt-16">
      <Link href="/#work" className="label transition-colors hover:text-signal">
        ← All work
      </Link>

      <header className="grid gap-12 pt-12 pb-20 @5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:items-end">
        <div>
          <p className="label mb-6">
            <span className="text-signal">{code(p)}</span> {`// ${p.kind}`}
          </p>
          <h1 className="glow text-6xl font-semibold tracking-tight uppercase @xl:text-8xl">
            <Scramble text={p.name} />
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-2">{p.description}</p>
        </div>

        <dl className="hud p-5">
          <p className="label mb-4 border-b border-line pb-3 text-signal">Spec sheet</p>
          <div className="flex items-center justify-between py-1.5">
            <dt className="label">Status</dt>
            <dd>
              <StatusDot status={p.status} />
            </dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="label">Year</dt>
            <dd className="font-mono text-xs">{p.year}</dd>
          </div>
          <div className="py-1.5">
            <dt className="label mb-2">Stack</dt>
            <dd className="flex flex-wrap gap-1.5">
              {p.stack.map((s) => (
                <span
                  key={s}
                  className="label border border-line px-2 py-1 text-[0.625rem] text-ink"
                >
                  {s}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </header>

      {p.highlights && p.highlights.length > 0 && (
        <section className="border-t border-line py-12">
          <h2 className="label mb-6 text-signal">{"// Highlights"}</h2>
          <ul className="max-w-3xl space-y-3">
            {p.highlights.map((h) => (
              <li key={h} className="flex gap-3 leading-relaxed text-ink-2">
                <span aria-hidden="true" className="text-signal">
                  ▸
                </span>
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section className="grid gap-4 border-t border-line py-12 @3xl:grid-cols-3">
          {notes.map(([title, body]) => (
            <div key={title} className="hud p-6">
              <h2 className="label mb-3 text-signal">{title}</h2>
              <p className="font-mono text-sm leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </section>
      )}

      {links.length > 0 && (
        <section className="grid gap-4 border-t border-line py-12 @xl:grid-cols-2 @5xl:grid-cols-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="hud hud-hover group flex items-center justify-between p-6"
            >
              <span>
                <span className="label block">{l.detail}</span>
                <span className="mt-1 block text-xl font-semibold group-hover:text-signal">
                  {l.label}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-signal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                ↗
              </span>
            </a>
          ))}
        </section>
      )}
    </article>
  );
}
