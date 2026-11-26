import { HeroTitle } from "@/components/console/HeroTitle";
import { HeroTypeout } from "@/components/console/HeroTypeout";
import { ReadoutPanel } from "@/components/console/ReadoutPanel";
import { WorkGrid } from "@/components/console/WorkGrid";
import { ProjectCard } from "@/components/hud/ProjectCard";
import { SectionHeader } from "@/components/hud/SectionHeader";
import { period, profile, projects } from "@/lib/profile";

export default function Home() {
  const { person, links, experience, skills } = profile;
  const current = experience.find((e) => e.end === null);

  const readout: [string, string][] = [
    ["Operator", person.fullName],
    ["Role", person.title],
    ["Station", current?.company ?? "Independent"],
    ["Location", person.location],
    ["Coords", "0.63°S 73.16°E"],
    ["Projects", String(projects.length).padStart(2, "0")],
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section
        id="top"
        aria-labelledby="hero"
        className="grid gap-12 pt-20 pb-28 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end"
      >
        <div className="min-w-0">
          <p className="label mb-6 flex items-center gap-3">
            <span className="text-signal">[ ID ]</span> {person.fullName} — {person.title}
          </p>
          <h1 id="hero" className="text-display font-semibold uppercase [overflow-wrap:anywhere]">
            <span className="glow bg-gradient-to-b from-ink to-ink-2 bg-clip-text text-transparent">
              <HeroTitle name={person.name} />
            </span>
            <span className="text-signal">.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-2">{person.intro}</p>
          <HeroTypeout />
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#work"
              className="chamfer label bg-signal px-6 py-3.5 font-medium text-void transition-opacity hover:opacity-85"
            >
              View work →
            </a>
            <a
              href={links.cv}
              className="chamfer label border border-line-strong px-6 py-3.5 text-ink transition-colors hover:border-signal hover:text-signal"
            >
              Résumé ↓
            </a>
          </div>
        </div>

        <ReadoutPanel rows={readout} />
      </section>

      {/* ── Work ── */}
      <section aria-labelledby="work-title" id="work" className="scroll-mt-24 pb-28">
        <SectionHeader index="01" title="Work" id="work-title" />
        <WorkGrid
          items={projects.map((p) => ({ slug: p.slug, node: <ProjectCard project={p} /> }))}
        />
      </section>

      {/* ── Log (experience) ── */}
      <section aria-labelledby="log-title" id="log" className="scroll-mt-24 pb-28">
        <SectionHeader index="02" title="Log" id="log-title" />
        <ol className="relative ml-1.5 border-l border-line">
          {experience.map((e) => (
            <li key={e.company} className="relative pb-12 pl-8 last:pb-0">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[5px] size-[9px] rotate-45 border ${e.end === null ? "border-signal bg-signal" : "border-line-strong bg-void"}`}
              />
              <p className="label">{period(e.start, e.end)}</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">
                {e.role} <span className="text-ink-3">@</span>{" "}
                <span className="text-signal">{e.company}</span>
              </h3>
              {e.highlights.length > 0 && (
                <ul className="mt-4 max-w-2xl space-y-2">
                  {e.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                      <span aria-hidden="true" className="text-signal">
                        ▸
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Systems (skills) ── */}
      <section aria-labelledby="systems-title" id="systems" className="scroll-mt-24 pb-28">
        <SectionHeader index="03" title="Systems" id="systems-title" />
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((s) => (
            <div key={s.name} className="bg-void p-6">
              <h3 className="label mb-4 text-signal">{s.name}</h3>
              <ul className="space-y-1.5">
                {s.items.map((i) => (
                  <li key={i} className="font-mono text-sm text-ink-2">
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section aria-labelledby="contact-title" id="contact" className="scroll-mt-24">
        <SectionHeader index="04" title="Uplink" id="contact-title" />
        <div className="hud p-8 sm:p-12">
          <p className="label mb-4">Open channel</p>
          <a
            href={`mailto:${links.email}`}
            className="glow block break-all text-3xl font-semibold tracking-tight transition-colors hover:text-signal sm:text-5xl"
          >
            {links.email}
          </a>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer"
              className="label transition-colors hover:text-signal"
            >
              GitHub ↗ @{person.handle}
            </a>
            <a href={links.cv} className="label transition-colors hover:text-signal">
              Résumé ↓ PDF
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
