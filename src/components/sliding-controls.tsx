import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type Variant = "underline" | "outline" | "pill";

const looks: Record<Variant, string> = {
  underline: "h-[2px] bg-accent",
  outline: "border border-strong-line",
  pill: "rounded-full bg-visual-bg",
};

/** An underline sits on the bottom edge; the others cover the whole button. */
const geometry: Record<Variant, CSSProperties> = {
  underline: {
    width: "var(--indicator-width, 0px)",
    transform:
      "translate(var(--indicator-x, 0px), calc(var(--indicator-y, 0px) + var(--indicator-height, 0px) - 2px))",
  },
  outline: {
    width: "var(--indicator-width, 0px)",
    height: "var(--indicator-height, 0px)",
    transform: "translate(var(--indicator-x, 0px), var(--indicator-y, 0px))",
  },
  pill: {
    width: "var(--indicator-width, 0px)",
    height: "var(--indicator-height, 0px)",
    transform: "translate(var(--indicator-x, 0px), var(--indicator-y, 0px))",
  },
};

/** One shared indicator moves between buttons, including after responsive reflow. */
export default function SlidingControls({
  value,
  className,
  label,
  variant = "outline",
  children,
}: {
  value: string;
  className: string;
  label: string;
  variant?: Variant;
  children: ReactNode;
}) {
  const group = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = group.current;
    if (!element) return;
    const measure = () => {
      const active =
        element.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (!active) return;
      element.style.setProperty("--indicator-x", `${active.offsetLeft}px`);
      element.style.setProperty("--indicator-y", `${active.offsetTop}px`);
      element.style.setProperty("--indicator-width", `${active.offsetWidth}px`);
      element.style.setProperty(
        "--indicator-height",
        `${active.offsetHeight}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const button of element.querySelectorAll("button"))
      observer.observe(button);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div
      ref={group}
      className={`${className} relative`}
      role="group"
      aria-label={label}
    >
      <span
        className={`pointer-events-none absolute top-0 left-0 z-0 transition-[transform,width,height] duration-300 ease-[var(--ease-spring)] ${looks[variant]}`}
        style={geometry[variant]}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
