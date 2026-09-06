import { useEffect, useState } from "react";

const sections = [
  { id: "work", label: "Selected work" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

/** A rail marking which section you're in. Labels appear on approach. */
export default function SectionNav() {
  const [active, setActive] = useState("");
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      /* The last section is short and sits above a short footer, so it can
         never scroll up past the line. At the end of the page it wins outright. */
      const bottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      let current = "";
      if (bottom) current = sections[sections.length - 1].id;
      else
        for (const { id } of sections) {
          const top = document.getElementById(id)?.getBoundingClientRect().top;
          if (top !== undefined && top <= line) current = id;
        }
      setActive((previous) => (previous === current ? previous : current));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    // Accordions and project filters change the page height under us.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  return (
    <nav
      className="fixed top-1/2 right-6 z-40 -translate-y-1/2 max-lg:hidden"
      aria-label="Sections"
    >
      <ul className="flex flex-col gap-4">
        {sections.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="group/dot flex items-center justify-end gap-3"
              aria-current={active === id ? "true" : undefined}
            >
              <span className="font-mono text-[10px] tracking-[1px] text-muted uppercase opacity-0 transition-opacity duration-200 group-hover/dot:opacity-100 group-focus-visible/dot:opacity-100">
                {label}
              </span>
              <span
                className={`size-[7px] rounded-full border transition-[background-color,border-color,scale] duration-300 ease-[var(--ease-spring)] ${
                  active === id
                    ? "scale-125 border-accent bg-accent"
                    : "border-strong-line bg-transparent group-hover/dot:border-accent"
                }`}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
