import { useEffect, useId, useRef, useState } from "react";
import useDraggableBubble from "./use-draggable-bubble";
import SlidingControls from "./sliding-controls";

type Preference = "auto" | "light" | "dark";

const readPreference = () =>
  (document.documentElement.dataset.themePreference || "auto") as Preference;

const choices = [
  { value: "auto", label: "Auto", description: "Follow your device" },
  { value: "light", label: "Light", description: "A softer shade of light" },
  { value: "dark", label: "Dark", description: "Keep the lights low" },
] as const;

const collapsed = 48;
const expandedWidth = choices.length * 44 + 8;

function ThemeIcon({ theme }: { theme: Preference }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {theme === "auto" ? (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      ) : theme === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      ) : (
        <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />
      )}
    </svg>
  );
}

export default function ThemeSwitcher() {
  const [preference, setPreference] = useState<Preference>(readPreference);
  const [open, setOpen] = useState(false);
  const bubble = useDraggableBubble(() => setOpen(false));
  const x = bubble.position?.x ?? 16;
  const y = bubble.position?.y ?? bubble.viewport.height - 64;
  const right = x > bubble.viewport.width / 2;
  const dock = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const sync = () => setPreference(readPreference());
    window.addEventListener("portfolio-theme-applied", sync);
    return () => window.removeEventListener("portfolio-theme-applied", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    group.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dock.current?.contains(event.target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={dock}
      className="group fixed z-50 size-12 bottom-[max(16px,env(safe-area-inset-bottom))] left-[max(16px,env(safe-area-inset-left))]"
      data-open={open}
      data-side={right ? "right" : "left"}
      style={bubble.position ? { left: x, top: y, bottom: "auto" } : undefined}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      {/* Pinned to the docked edge, so widening always grows into the screen. */}
      <div
        className={`absolute top-0 h-12 overflow-hidden rounded-full border border-strong-line bg-surface transition-[width,box-shadow] duration-[420ms] ease-[var(--ease-spring)] motion-safe:animate-bubble-arrive ${right ? "right-0" : "left-0"} ${open ? "shadow-[0_10px_34px_#00000030]" : "shadow-[0_4px_22px_#00000024]"}`}
        style={{
          width: open ? expandedWidth : collapsed,
          rotate: `${bubble.tilt}deg`,
        }}
      >
        <button
          ref={trigger}
          type="button"
          className={`absolute top-0 grid size-12 place-items-center text-accent transition-[opacity,transform] duration-200 ${right ? "right-0" : "left-0"} ${open ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100"} ${bubble.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          aria-label="Appearance"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-describedby={`${id}-help`}
          tabIndex={open ? -1 : 0}
          {...bubble.handlers}
          onClick={() => {
            if (!bubble.consumeDragClick()) setOpen((value) => !value);
          }}
        >
          <span
            key={preference}
            className="motion-safe:animate-icon-arrive"
            aria-hidden="true"
          >
            <ThemeIcon theme={preference} />
          </span>
        </button>
        <div ref={group} id={`${id}-options`} inert={!open}>
          <SlidingControls
            className={`flex h-12 items-center px-1 transition-opacity duration-200 ${open ? "opacity-100 delay-100" : "pointer-events-none opacity-0"}`}
            value={preference}
            label="Colour theme"
            variant="pill"
          >
            {choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className="relative z-10 grid h-10 w-11 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-fg active:text-fg aria-pressed:text-accent"
                aria-label={`${choice.label} — ${choice.description}`}
                aria-pressed={preference === choice.value}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("portfolio-theme-change", {
                      detail: choice.value,
                    }),
                  );
                  setOpen(false);
                  trigger.current?.focus({ preventScroll: true });
                }}
              >
                <ThemeIcon theme={choice.value} />
              </button>
            ))}
          </SlidingControls>
        </div>
      </div>
      {/* Only while collapsed, and on whichever side the bubble is docked. */}
      <span
        className="pointer-events-none absolute bottom-[10px] left-[60px] -translate-x-1 rounded-md border border-line bg-surface px-[9px] py-1.5 text-[12px] whitespace-nowrap text-secondary opacity-0 transition-[opacity,transform] duration-200 group-data-[side=right]:right-[60px] group-data-[side=right]:left-auto group-data-[side=right]:translate-x-1 group-[[data-open=false]:hover]:translate-x-0 group-[[data-open=false]:hover]:opacity-100 group-[[data-open=false]:focus-within]:translate-x-0 group-[[data-open=false]:focus-within]:opacity-100"
        aria-hidden="true"
      >
        Appearance · drag to move
      </span>
      <span id={`${id}-help`} className="sr-only">
        Opens three theme options. Drag to move, or use arrow keys while focused.
      </span>
    </div>
  );
}
