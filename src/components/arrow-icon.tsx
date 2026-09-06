type Direction =
  | "up-right"
  | "down"
  | "up"
  | "right"
  | "turn-right"
  | "turn-down";

const paths: Record<Direction, string> = {
  "up-right": "M6 18 18 6M6 6h12v12",
  down: "M12 4v16m-6-6 6 6 6-6",
  up: "M12 20V4m-6 6 6-6 6 6",
  right: "M4 12h16m-6-6 6 6-6 6",
  "turn-right": "M5 4v10a3 3 0 0 0 3 3h12m-5-5 5 5-5 5",
  "turn-down": "M4 5h10a3 3 0 0 1 3 3v12m-5-5 5 5 5-5",
};

/**
 * Each arrow nudges the way it points when an ancestor `group` is hovered.
 * `hover:` never fires on touch, so every nudge has a press counterpart.
 */
const nudge: Record<Direction, string> = {
  "up-right":
    "motion-safe:group-hover:translate-x-[2px] motion-safe:group-hover:-translate-y-[2px] motion-safe:group-active:translate-x-[2px] motion-safe:group-active:-translate-y-[2px]",
  down: "motion-safe:group-hover:translate-y-[3px] motion-safe:group-active:translate-y-[3px]",
  up: "motion-safe:group-hover:-translate-y-[3px] motion-safe:group-active:-translate-y-[3px]",
  right: "",
  "turn-right": "",
  "turn-down": "",
};

/** SVG rather than a glyph, so arrows stay monochrome on iOS and Android. */
export default function ArrowIcon({
  direction = "up-right",
  className = "size-[1em]",
}: {
  direction?: Direction;
  className?: string;
}) {
  return (
    <svg
      className={`inline-block min-w-[1em] shrink-0 align-[-0.15em] transition-transform duration-[240ms] ease-[var(--ease-settle)] ${nudge[direction]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[direction]} />
    </svg>
  );
}
