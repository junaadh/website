import type { Status } from "@/lib/profile";

const STYLE: Record<Status, { label: string; color: string; pulse: boolean }> = {
  active: { label: "Active", color: "text-ok bg-ok", pulse: true },
  shipped: { label: "Shipped", color: "text-signal bg-signal", pulse: false },
  experiment: { label: "Experiment", color: "text-warn bg-warn", pulse: false },
  archived: { label: "Archived", color: "text-off bg-off", pulse: false },
};

// Colour is never the only signal: the dot always comes with a word.
export function StatusDot({ status }: { status: Status }) {
  const s = STYLE[status];
  return (
    <span className="label inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${s.color} ${s.pulse ? "animate-pulse-dot" : ""}`}
      />
      {s.label}
    </span>
  );
}
