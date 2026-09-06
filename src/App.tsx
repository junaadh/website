import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import profile from "./data/profile.json";
import ThemeSwitcher from "./components/theme-switcher";
import Accordion from "./components/accordion";
import ArrowIcon from "./components/arrow-icon";
import useReveal from "./components/use-reveal";
import SlidingControls from "./components/sliding-controls";
import SectionNav from "./components/section-nav";
import CommandPalette from "./components/command-palette";
import { copyText } from "./components/copy-text";

const filters = ["All work", "Systems", "Full stack", "Native"];
// Bypass copies stored under the previous one-year immutable cache policy.
const cvUrl = "/cv.pdf?v=typst-1";

const shell =
  "mx-auto w-[min(1200px,calc(100%-112px))] max-lg:w-[calc(100%-64px)] max-md:w-[calc(100%-40px)]";
const section = "pt-[100px] max-md:pt-[65px]";
const heading2 =
  "text-[40px] leading-[1.2] tracking-[-1.6px] mt-[17px] max-md:text-[32px] max-md:tracking-[-1px]";
// useReveal flips data-reveal as each element scrolls in; see use-reveal.ts.
const reveal =
  "data-[reveal=pending]:opacity-0 data-[reveal=pending]:translate-y-5 data-[reveal=visible]:animate-arrive";

function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[12px] leading-[1.6] tracking-[1.3px] text-muted uppercase ${className}`}
    >
      {children}
    </p>
  );
}

function TextLink({
  href,
  children,
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  return (
    <a
      className={`group inline-flex items-center gap-[17px] text-[14px] ${className}`}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children} <ArrowIcon className="size-[18px]" />
    </a>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="mt-[23px] flex flex-wrap gap-[7px]">
      {items.map((tag) => (
        <span
          key={tag}
          className="border border-visual-line px-2 py-[6px] font-mono text-[10px] text-secondary transition-[color,background-color,border-color] duration-[180ms] hover:border-strong-line hover:text-accent active:border-strong-line active:text-accent"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

/** Advertises the palette, and opens it for anyone who'd rather click. */
function PaletteHint() {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.userAgent)), []);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("portfolio-command-open"))}
      className="flex items-center gap-1 border border-visual-line px-[6px] py-[3px] text-[10px] tracking-normal text-muted transition-colors duration-200 hover:border-strong-line hover:text-accent active:border-strong-line active:text-accent max-sm:hidden"
      aria-label="Open the command palette"
    >
      <span aria-hidden="true">{mac ? "⌘" : "Ctrl"}</span>
      <span aria-hidden="true">K</span>
    </button>
  );
}

/** Click copies rather than firing a mailto: the circular arrow still does that. */
function CopyEmail({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-[10px] text-left transition-colors duration-200 hover:text-accent active:text-accent ${className}`}
      onClick={async () =>
        setState((await copyText(profile.email)) ? "done" : "failed")
      }
    >
      {profile.email}
      <span
        className={`inline-flex items-center gap-[6px] font-mono text-[10px] tracking-[1px] uppercase transition-[opacity,transform] duration-200 ${
          state === "idle"
            ? "translate-y-[3px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
            : "translate-y-0 text-accent opacity-100"
        }`}
        aria-hidden="true"
      >
        {state === "idle" ? "copy" : state === "done" ? "copied ✓" : "copy failed"}
      </span>
      <span role="status" className="sr-only">
        {state === "done"
          ? "Email address copied"
          : state === "failed"
            ? "Could not copy the email address"
            : ""}
      </span>
    </button>
  );
}

/** A 6px dot with a slow halo, so "available" reads as alive rather than static. */
function StatusDot() {
  return (
    <span className="relative inline-flex size-[6px] shrink-0">
      <span className="absolute inset-0 rounded-full bg-accent motion-safe:animate-ping-slow" />
      <span className="relative size-[6px] rounded-full bg-accent" />
    </span>
  );
}

const encoder = new TextEncoder();
type Cell = { byte: number; char: string; lead: boolean; last: boolean };

/**
 * Splits a string into UTF-8 bytes while remembering which character each byte
 * came from, so multi-byte sequences can be shown as one run.
 */
function toCells(value: string): Cell[] {
  const cells: Cell[] = [];
  for (const char of value) {
    const bytes = encoder.encode(char);
    for (let i = 0; i < bytes.length; i++)
      cells.push({
        byte: bytes[i],
        char,
        lead: i === 0,
        last: i === bytes.length - 1,
      });
  }
  return cells;
}

const bases = { hex: 16, dec: 10, bin: 2 } as const;
const widths = { hex: 2, dec: 3, bin: 8 } as const;
const baseLabels = { hex: "BASE 16", dec: "BASE 10", bin: "BASE 2" } as const;
type Format = keyof typeof bases;

const render = (byte: number, format: Format) =>
  byte.toString(bases[format]).padStart(widths[format], "0");

function ByteInspector() {
  const [value, setValue] = useState("hello, world");
  const [format, setFormat] = useState<Format>("hex");
  const [hovered, setHovered] = useState<number | null>(null);
  const cells = useMemo(() => toCells(value), [value]);
  const length = Math.max(16, Math.ceil(cells.length / 8) * 8);
  const active = hovered === null ? null : (cells[hovered] ?? null);

  return (
    <div className="border border-visual-line bg-[linear-gradient(140deg,var(--visual-bg),var(--visual-deep))] font-mono shadow-[0_0_70px_#b3ec5c06]">
      <div className="flex justify-between border-b border-visual-line p-[17px] text-[10px] text-muted">
        <span>
          <i className="mr-[7px] inline-block size-[5px] bg-accent" /> MEMORY
          VIEW
        </span>
        <span>
          UTF-8 / {baseLabels[format]} /{" "}
          <span className="text-accent">{cells.length}</span> B
        </span>
      </div>
      <div className="mx-5 mt-[25px] mb-[23px] flex items-center gap-[14px] text-[14px]">
        <label htmlFor="memory-input" className="whitespace-nowrap text-accent">
          &gt; write
        </label>
        <input
          id="memory-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          spellCheck={false}
          autoComplete="off"
          aria-describedby="memory-hint"
          className="w-full border-0 bg-transparent p-1 text-fg"
        />
      </div>
      <div
        className="mx-5 mb-6 grid grid-cols-8 border-t border-l border-visual-line"
        aria-label={`${cells.length} UTF-8 bytes`}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}
      >
        {Array.from({ length }, (_, index) => {
          const cell = cells[index];
          // A run is the tail of a multi-byte character; tint it as one block.
          const run = cell && !cell.lead;
          return (
            <div
              key={index}
              onPointerEnter={(e) =>
                e.pointerType === "mouse" && setHovered(cell ? index : null)
              }
              onPointerDown={() => setHovered(cell ? index : null)}
              style={{ animationDelay: `${Math.min(index, 15) * 22}ms` }}
              className={`relative flex min-h-16 flex-col gap-[10px] border-r border-b border-visual-line px-[6px] py-2 transition-colors duration-200 max-lg:px-1 motion-safe:animate-cell-in ${cell ? "cursor-crosshair" : ""} ${hovered === index ? "bg-cell" : ""}`}
            >
              {cell && (
                <span
                  key={`${cell.byte}-${run}`}
                  className={`pointer-events-none absolute inset-0 origin-center motion-safe:animate-cell-fill ${run ? "bg-cell opacity-60" : "bg-cell"}`}
                  aria-hidden="true"
                />
              )}
              <span className="relative text-[9px] text-muted">
                {index.toString(16).padStart(2, "0")}
              </span>
              <b
                key={`${format}-${cell?.byte ?? "empty"}`}
                className={`relative font-normal motion-safe:animate-byte-change ${
                  format === "bin"
                    ? "text-[8px] tracking-[-0.5px] max-lg:text-[7px] max-md:text-[9px] max-sm:text-[7px]"
                    : "text-[16px]"
                } ${cell ? (run ? "text-strong-line" : "text-accent") : "text-faint"}`}
              >
                {cell ? render(cell.byte, format) : "··"}
              </b>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-visual-line px-[17px] py-3 text-[10px] text-muted">
        <span id="memory-hint" role="status" className="truncate">
          {active ? (
            <>
              <span className="text-accent">
                {active.lead ? `'${active.char}'` : "cont."}
              </span>{" "}
              0x{render(active.byte, "hex")} · {active.byte} · 0b
              {render(active.byte, "bin")}
            </>
          ) : (
            "Type something. See the bytes."
          )}
        </span>
        <SlidingControls
          className="flex gap-[2px]"
          value={format}
          label="Byte display format"
          variant="outline"
        >
          {(Object.keys(bases) as Format[]).map((f) => (
            <button
              type="button"
              key={f}
              className="relative z-10 border border-transparent bg-transparent p-[6px] font-mono text-[10px] text-muted transition-colors duration-200 hover:text-secondary active:text-secondary aria-pressed:text-accent"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </SlidingControls>
      </div>
    </div>
  );
}

const panel =
  "flex flex-col items-center gap-[10px] border border-visual-line bg-visual-deep px-[18px] py-3 min-w-[78px] transition-transform duration-[250ms] ease-[var(--ease-spring)] motion-safe:group-hover:-translate-y-[3px] motion-safe:group-active:-translate-y-[3px] max-md:min-w-0 max-md:p-[10px] max-md:text-[9px] max-sm:px-[18px] max-sm:py-3";
const mark = "text-[28px] text-secondary max-md:text-[20px]";

function ProjectGraphic({ motif }: { motif: string }) {
  if (motif === "compiler")
    return (
      <div
        className="flex items-center gap-5 font-mono text-[11px] text-muted max-lg:gap-[10px] max-md:gap-[7px] max-sm:gap-[18px]"
        aria-hidden="true"
      >
        <span className={panel}>
          source<span className={mark}>{"{ }"}</span>
        </span>
        <ArrowIcon direction="right" className="size-[17px] text-faint" />
        <span className={`${panel} [transition-delay:40ms]`}>
          parse<span className={mark}>⑂</span>
        </span>
        <ArrowIcon direction="right" className="size-[17px] text-faint" />
        <span className={`${panel} [transition-delay:80ms]`}>
          emit<span className={mark}>01</span>
        </span>
      </div>
    );
  if (motif === "asm")
    return (
      <pre
        className="mt-[25px] min-w-[200px] font-mono text-[16px] leading-[1.7]"
        aria-hidden="true"
      >
        <span className="text-[11px] text-secondary">; aarch64 / socket</span>
        {"\n"}
        <em className="mr-5 text-accent not-italic">mov</em> x0,{" "}
        <span className="text-secondary">#2</span>
        {"\n"}
        <em className="mr-5 text-accent not-italic">mov</em> x1,{" "}
        <span className="text-secondary">#1</span>
        {"\n"}
        <em className="mr-5 text-accent not-italic">svc</em>{" "}
        <span className="text-secondary">#0</span>
      </pre>
    );
  if (motif === "auth")
    return (
      <div
        className="flex items-center gap-3 font-mono text-[12px] text-muted max-md:gap-[7px] max-md:text-[10px] max-sm:gap-3 max-sm:text-[12px]"
        aria-hidden="true"
      >
        <span>identity</span>
        <ArrowIcon direction="right" className="size-[17px] text-faint" />
        <b className="border border-strong-line bg-cell p-4 font-normal text-accent max-md:p-[10px] max-sm:p-4">
          ● verified
        </b>
        <ArrowIcon direction="right" className="size-[17px] text-faint" />
        <span>session</span>
      </div>
    );
  return (
    <div
      className={`font-medium text-secondary ${motif === "commerce" ? "font-[Georgia,serif] text-[48px] italic" : "text-[38px] tracking-[-1.5px]"}`}
      aria-hidden="true"
    >
      {motif === "commerce" ? (
        "bloom light."
      ) : motif === "requests" ? (
        <>
          req <ArrowIcon direction="right" className="size-[0.8em]" /> res
        </>
      ) : motif === "native" ? (
        "presence_"
      ) : (
        ":helix"
      )}
    </div>
  );
}

function App() {
  useReveal();
  const [filter, setFilter] = useState("All work");
  const [displayFilter, setDisplayFilter] = useState(filter);
  useEffect(() => {
    if (filter === displayFilter) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 140;
    const timer = window.setTimeout(() => setDisplayFilter(filter), delay);
    return () => window.clearTimeout(timer);
  }, [filter, displayFilter]);
  const projects = useMemo(
    () =>
      profile.projects.filter(
        (p) => displayFilter === "All work" || p.category === displayFilter,
      ),
    [displayFilter],
  );

  return (
    <>
      <a
        className="fixed -top-[100px] left-6 z-[100] bg-accent p-4 text-on-accent transition-[top] duration-200 focus:top-3"
        href="#main"
      >
        Skip to content
      </a>
      <div
        className={`${shell} flex items-center justify-between py-[27px] max-md:py-5`}
      >
        <a
          className="flex items-center gap-[10px] font-mono text-[34px] leading-none font-bold"
          href="#"
          aria-label="Junad, home"
        >
          <img
            src="/favicon.svg"
            width="40"
            height="40"
            alt=""
            className="size-10"
          />
          <span className="text-[14px] font-normal max-xs:hidden">junaadh</span>
        </a>
        <div className="flex items-center gap-4 font-mono text-[12px] tracking-[1px] text-muted max-md:text-[10px] max-md:tracking-[0.4px] max-sm:text-[9px]">
          <span>MALDIVES · UTC+05:00</span>
          <PaletteHint />
        </div>
      </div>

      <main id="main">
        <section
          className={`${shell} pt-[42px] max-md:pt-3`}
          aria-labelledby="hero-title"
        >
          <div className="grid grid-cols-[1.15fr_1fr] items-center gap-[60px] pt-[84px] pb-[72px] wide:py-[100px] max-lg:gap-8 max-md:grid-cols-1 max-md:gap-[45px] max-md:pt-12 max-md:pb-[38px]">
            <div className="[&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] [&>*:nth-child(5)]:[animation-delay:240ms] [&>*]:animate-arrive">
              <p className="mb-[22px] font-[Georgia,serif] text-[22px] leading-[1.6] tracking-normal text-secondary italic">
                Hi, I'm {profile.commonName}.
              </p>
              <h1
                id="hero-title"
                className="text-[clamp(52px,5.4vw,76px)] leading-[1.06] tracking-[-4px] max-lg:text-[56px] max-lg:tracking-[-2.5px] max-md:text-[clamp(46px,10vw,72px)] max-md:tracking-[-2.7px]"
              >
                From the bits.
                <br />
                To the <span className="text-accent">browser.</span>
              </h1>
              <p className="my-[27px] max-w-[430px] text-[17px] leading-[1.75] text-muted max-md:max-w-[480px] max-md:text-[16px]">
                I’m a developer from the Maldives. I build web apps and backend
                services, and I like getting underneath them to see how things
                actually work.
              </p>
              <div className="flex items-center gap-7 max-md:gap-5">
                <a
                  className="group inline-flex items-center gap-[30px] bg-accent px-[21px] py-4 text-[14px] text-on-accent transition-[background-color,transform,translate] duration-200 hover:bg-accent-hover hover:text-on-accent active:bg-accent-hover motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 max-md:gap-4"
                  href="#work"
                >
                  A few things I’ve built{" "}
                  <ArrowIcon direction="down" className="size-[18px]" />
                </a>
                <TextLink href={profile.github} external>
                  GitHub
                </TextLink>
              </div>
              <div className="mt-9 flex items-center gap-[7px] text-[12px] text-muted max-md:mt-[27px] max-sm:text-[11px]">
                <span
                  className="mr-1 font-mono text-[21px] text-accent"
                  aria-hidden="true"
                >
                  +
                </span>{" "}
                Currently building at{" "}
                <a
                  className="group inline-flex items-center gap-[7px] text-secondary"
                  href="#experience"
                >
                  SME Digital <ArrowIcon />
                </a>
              </div>
            </div>
            {/* scroll-exit and animate-arrive both drive `animation`, so they
                sit on separate elements rather than fighting over it. */}
            <div className="scroll-exit relative min-w-0 max-md:w-full max-md:max-w-[520px]">
              <div className="animate-arrive [animation-delay:160ms]">
                <div className="flex justify-between gap-[10px] pb-[14px] font-mono text-[10px] leading-[1.6] text-muted max-sm:text-[9px]">
                  <span>A SMALL THING TO PLAY WITH</span>
                  <span className="text-accent" aria-hidden="true">
                    [ interactive ]
                  </span>
                </div>
                <ByteInspector />
                <div className="flex justify-between gap-[10px] pt-[15px] font-mono text-[12px] leading-[1.6] text-muted">
                  <span>A little hello, underneath it all.</span>
                  <ArrowIcon direction="turn-right" />
                </div>
              </div>
            </div>
          </div>
          <div className="group/ticker flex justify-between gap-4 border-y border-line py-6 font-mono text-[11px] tracking-[1px] text-muted max-md:text-[9px] max-md:tracking-normal">
            <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_28px,#000_calc(100%-28px),transparent)]">
              <div className="flex w-max motion-safe:animate-marquee group-hover/ticker:[animation-play-state:paused]">
                {[0, 1].map((copy) => (
                  <span
                    key={copy}
                    className="flex shrink-0"
                    aria-hidden={copy === 1 || undefined}
                  >
                    {profile.stack.map((item) => (
                      <span key={item} className="flex items-center">
                        {item}
                        <i className="mx-[15px] text-faint not-italic max-lg:mx-[7px] max-md:mx-[5px]">
                          /
                        </i>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
            <a
              className="group flex shrink-0 items-center gap-[7px] max-md:hidden"
              href="#work"
            >
              SCROLL TO EXPLORE <ArrowIcon direction="down" />
            </a>
          </div>
        </section>

        <section
          className={`${shell} ${section}`}
          id="work"
          aria-labelledby="work-title"
        >
          <div
            data-reveal=""
            className={`mb-9 flex items-end justify-between gap-6 max-md:items-start ${reveal}`}
          >
            <div>
              <Eyebrow>01 / SELECTED WORK</Eyebrow>
              <h2 id="work-title" className={heading2}>
                Things I’ve made.
                <br />
                <span className="text-muted">And learned along the way.</span>
              </h2>
            </div>
            <TextLink
              href={profile.github}
              external
              className="pb-[7px] max-md:max-w-[100px] max-md:gap-[6px] max-md:text-[12px] max-md:leading-[1.6]"
            >
              All repositories
            </TextLink>
          </div>
          <div className="mb-[30px] flex items-center justify-between border-b border-line">
            <SlidingControls
              className="flex gap-[25px] max-md:gap-[21px]"
              value={filter}
              label="Filter projects"
              variant="underline"
            >
              {filters.map((f) => (
                <button
                  type="button"
                  key={f}
                  className="relative z-10 border-0 border-b-2 border-transparent bg-none py-[14px] text-[14px] text-muted transition-colors duration-200 hover:text-secondary active:text-secondary aria-pressed:text-accent max-md:min-h-[44px] max-md:text-[12px]"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === "All work" && (
                    <span className="ml-[7px] align-super font-mono text-[10px]">
                      {profile.projects.length.toString().padStart(2, "0")}
                    </span>
                  )}
                </button>
              ))}
            </SlidingControls>
            <span
              className="font-mono text-[11px] text-muted max-md:hidden"
              role="status"
            >
              {projects.length} projects
            </span>
          </div>
          <div
            key={displayFilter}
            data-leaving={filter !== displayFilter}
            className="grid grid-cols-2 gap-7 transition-[opacity,transform] duration-150 data-[leaving=true]:translate-y-1 data-[leaving=true]:opacity-0 max-md:gap-5 max-sm:grid-cols-1"
          >
            {projects.map((project, index) => (
              <a
                key={project.name}
                style={{ animationDelay: `${index * 55}ms` }}
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="group animate-card-arrive border border-line bg-surface transition-[border-color,transform,translate,box-shadow] duration-300 hover:border-strong-line hover:text-inherit hover:shadow-[0_18px_38px_#00000014] active:border-strong-line motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1 motion-safe:active:-translate-y-1"
              >
                <div className="scroll-parallax relative flex h-[200px] items-center justify-center overflow-hidden border-b border-line bg-visual-bg bg-[radial-gradient(var(--dot-grid)_0.7px,transparent_0.7px)] bg-[size:16px_16px] max-md:h-[170px] max-sm:h-[200px]">
                  <span className="absolute top-[17px] left-5 font-mono text-[10px] tracking-[1px] text-muted uppercase">
                    {project.category}
                  </span>
                  <div className="transition-transform duration-500 ease-[var(--ease-settle)] motion-safe:group-hover:scale-[1.04] motion-safe:group-active:scale-[1.04]">
                    <ProjectGraphic motif={project.motif} />
                  </div>
                  <span
                    className="absolute right-[18px] bottom-[18px] grid size-[30px] place-items-center border border-visual-line text-secondary transition-colors duration-200 group-hover:bg-accent group-hover:text-on-accent group-active:bg-accent group-active:text-on-accent"
                    aria-label="Open project"
                  >
                    <ArrowIcon className="size-[18px]" />
                  </span>
                </div>
                <div className="p-[26px] max-md:p-5">
                  <Eyebrow className="text-[10px]">{project.label}</Eyebrow>
                  <h3 className="mt-2 mb-3 text-[26px] tracking-[-0.7px] max-md:text-[23px]">
                    {project.name}
                  </h3>
                  <p className="max-w-[48ch] text-[15px] leading-[1.75] text-muted max-md:text-[14px]">
                    {project.description}
                  </p>
                  <Tags items={project.tags} />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section
          className={`${shell} ${section}`}
          id="experience"
          aria-labelledby="experience-title"
        >
          <div
            data-reveal=""
            className={`mb-9 flex items-end justify-between gap-6 max-md:items-start ${reveal}`}
          >
            <div>
              <Eyebrow>02 / EXPERIENCE</Eyebrow>
              <h2 id="experience-title" className={heading2}>
                Where I've been building.
              </h2>
            </div>
          </div>
          <div className="border-t border-line">
            {profile.experience.map((job, index) => (
              <article
                key={job.company}
                data-reveal=""
                style={{ animationDelay: `${index * 70}ms` }}
                className={`grid grid-cols-[260px_1fr_155px] gap-7 border-b border-line py-[34px] max-lg:grid-cols-[200px_1fr] max-md:grid-cols-[145px_1fr] max-md:gap-[15px] max-sm:grid-cols-1 ${reveal}`}
              >
                <div className="flex flex-col items-start gap-4 font-mono text-[12px] leading-[1.6] text-muted max-md:text-[10px] max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:gap-3">
                  <span className="text-[11px] text-faint max-sm:hidden">
                    0{index + 1}
                  </span>
                  <span>{job.period}</span>
                  {job.current && (
                    <span className="flex items-center gap-[7px] text-[10px] text-accent">
                      <StatusDot /> CURRENT
                    </span>
                  )}
                </div>
                <div>
                  <p className="mb-[9px] font-mono text-[12px] text-muted">
                    {job.role}
                  </p>
                  <h3 className="mb-[13px] text-[27px] tracking-[-0.7px] max-md:text-[24px] max-sm:mt-0">
                    {job.company}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-muted">
                    {job.summary}
                  </p>
                  {job.bullets.length > 0 && (
                    <Accordion
                      label="What I worked on"
                      context={job.company}
                      defaultOpen={job.current}
                    >
                      <ul className="pl-[17px] text-[14px] leading-[1.75] text-muted">
                        {job.bullets.map((b) => (
                          <li key={b} className="py-1">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </Accordion>
                  )}
                  <Tags items={job.tags} />
                </div>
                <span className="text-right font-mono text-[11px] leading-[1.6] text-muted max-lg:hidden">
                  {job.location}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`${shell} ${section}`}
          id="about"
          aria-labelledby="about-title"
        >
          <div
            data-reveal=""
            className={`mb-[35px] flex items-center gap-4 ${reveal}`}
          >
            <img
              src={`${profile.github}.png?size=144`}
              alt={`${profile.name}'s GitHub profile picture`}
              width="72"
              height="72"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="size-[72px] rounded-full border border-line bg-visual-bg transition-transform duration-300 ease-[var(--ease-spring)] motion-safe:hover:scale-[1.06] motion-safe:hover:-rotate-[4deg] motion-safe:active:scale-[1.06] motion-safe:active:-rotate-[4deg]"
            />
            <span className="text-[13px] leading-[1.9] text-muted">
              A face to go with the code.
              <br />
              <b className="font-medium text-fg">
                Junad{" "}
                <ArrowIcon
                  direction="turn-down"
                  className="ml-[10px] size-[1em] text-accent"
                />
              </b>
            </span>
          </div>
          <div
            data-reveal=""
            className={`mb-[44px] grid grid-cols-2 items-center gap-[70px] max-lg:gap-[30px] max-md:grid-cols-1 max-md:gap-[25px] ${reveal}`}
          >
            <div>
              <Eyebrow>03 / A LITTLE ABOUT ME</Eyebrow>
              <h2 id="about-title" className={heading2}>
                Curiosity, all the
                <br />
                way down<span className="text-accent">.</span>
              </h2>
            </div>
            <div className="[&>p+p]:mt-[15px] [&>p]:text-[16px] [&>p]:leading-[1.85] [&>p]:text-muted">
              <p>{profile.about}</p>
              <p>
                Some projects solve a practical problem. Others start with “I
                wonder how that works.” I like having room for both.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 border-y border-line max-md:grid-cols-2">
            {profile.skills.map((skill, index) => (
              <article
                key={skill.name}
                data-reveal=""
                style={{ animationDelay: `${index * 80}ms` }}
                className={`group relative border-r border-line px-[25px] py-7 transition-colors duration-500 hover:bg-visual-bg/45 active:bg-visual-bg/45 first:pl-0 last:border-0 last:pr-0 max-lg:px-[18px] max-md:py-[25px] max-md:pr-5 max-md:nth-[-n+2]:border-b max-md:odd:pl-0 max-md:even:border-r-0 max-md:even:pl-5 max-md:last:border-0 max-md:last:pr-5 ${reveal}`}
              >
                {/* Accent rule draws itself across the card on approach. */}
                <span
                  className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-settle)] group-hover:scale-x-100 group-active:scale-x-100"
                  aria-hidden="true"
                />
                <span className="font-mono text-[11px] text-accent">
                  0{index + 1}
                </span>
                <h3 className="mt-5 mb-3 text-[20px] transition-transform duration-500 ease-[var(--ease-settle)] group-hover:translate-x-[6px] group-active:translate-x-[6px]">
                  {skill.name}
                </h3>
                <p className="min-h-[70px] text-[14px] leading-[1.7] text-muted max-md:min-h-[48px]">
                  {skill.description}
                </p>
                <ul className="mt-5 list-none p-0 font-mono text-[11px] leading-[2.4] text-secondary max-sm:text-[10px]">
                  {skill.items.map((item, position) => (
                    <li
                      key={item}
                      // Marker sits outside the flow, so nothing shifts at rest.
                      className="relative transition-transform duration-500 ease-[var(--ease-settle)] group-hover:translate-x-[11px] group-active:translate-x-[11px]"
                      style={{ transitionDelay: `${position * 45}ms` }}
                    >
                      <span
                        className="absolute top-1/2 -left-[11px] size-[3px] -translate-y-1/2 rounded-full bg-accent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-active:opacity-100"
                        style={{ transitionDelay: `${position * 45}ms` }}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div
            data-reveal=""
            className={`grid grid-cols-[1fr_2fr_1fr] gap-7 border-b border-line py-[34px] max-md:grid-cols-1 max-md:gap-4 ${reveal}`}
          >
            <Eyebrow>EDUCATION</Eyebrow>
            <div className="[&>p]:text-[13px] [&>p]:leading-[1.8]">
              <h3 className="mb-[10px] text-[18px]">
                {profile.education[0].institution}
              </h3>
              <p>{profile.education[0].qualification}</p>
              <p className="text-muted">{profile.education[0].details}</p>
              <Accordion label="Earlier education">
                {profile.education.slice(1).map((e) => (
                  <div className="mt-[18px]" key={e.institution}>
                    <h4 className="text-[14px] font-medium">{e.institution}</h4>
                    <p className="text-[13px] leading-[1.8]">
                      {e.qualification}
                    </p>
                    <p className="text-[13px] leading-[1.8] text-muted">
                      {e.period}
                    </p>
                  </div>
                ))}
              </Accordion>
            </div>
            <span className="text-right font-mono text-[11px] leading-[1.8] text-muted max-md:text-left">
              {profile.education[0].period}
            </span>
          </div>
          <div className="flex justify-between pt-[22px] font-mono text-[11px] text-muted">
            <span>HUMAN LANGUAGES</span>
            <p>{profile.languages.join(" / ")}</p>
          </div>
        </section>

        <section
          id="contact"
          data-reveal=""
          className={`${shell} mt-[100px] border border-visual-line bg-visual-bg p-[46px] max-md:mt-[65px] max-md:p-7 max-sm:p-[25px] ${reveal}`}
        >
          <Eyebrow>A PROJECT, A QUESTION, OR JUST A HELLO.</Eyebrow>
          <div className="mt-5 mb-[35px] flex items-center justify-between gap-[30px] max-sm:gap-3">
            <h2 className="text-[64px] leading-[1.05] tracking-[-2.5px] max-md:text-[46px] max-md:tracking-[-2px] max-sm:text-[40px]">
              Let's build
              <br />
              something <span className="text-accent">good.</span>
            </h2>
            <a
              className="grid size-[88px] place-items-center rounded-full border border-strong-line text-[45px] text-accent transition-transform duration-200 ease-[var(--ease-spring)] hover:rotate-45 active:rotate-45 max-md:size-[60px] max-md:shrink-0 max-md:text-[32px] max-sm:size-[50px] max-sm:text-[28px]"
              href={`mailto:${profile.email}`}
              aria-label={`Email ${profile.name}`}
            >
              <ArrowIcon className="size-[0.8em]" />
            </a>
          </div>
          <div className="flex justify-between gap-[25px] border-t border-visual-line pt-[25px] text-[15px] max-md:flex-col max-md:text-[14px]">
            <CopyEmail />
            <a
              className="group inline-flex items-center gap-[7px]"
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download résumé{" "}
              <span className="mx-[10px] border border-visual-line p-[3px] font-mono text-[10px] text-muted">
                PDF
              </span>{" "}
              <ArrowIcon direction="down" />
            </a>
          </div>
        </section>
      </main>
      <SectionNav />
      <CommandPalette />
      <ThemeSwitcher />
      <footer
        className={`${shell} flex justify-between pt-[35px] pb-[100px] font-mono text-[11px] text-muted max-md:gap-5 max-md:leading-[1.8] max-sm:flex-col`}
      >
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <div className="flex gap-[25px] max-md:gap-[15px]">
          <a
            className="group inline-flex items-center gap-[7px]"
            href={profile.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowIcon />
          </a>
          <a
            className="group inline-flex items-center gap-[7px]"
            href="https://x.com/junaadh"
            target="_blank"
            rel="noreferrer"
          >
            X <ArrowIcon />
          </a>
          <a className="group inline-flex items-center gap-[7px]" href="#">
            Back to top <ArrowIcon direction="up" />
          </a>
        </div>
      </footer>
    </>
  );
}
export default App;
