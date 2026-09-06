import { useId, useState } from "react";
import type { ReactNode } from "react";

export default function Accordion({
  label,
  context,
  defaultOpen = false,
  children,
}: {
  label: string;
  context?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="accordion">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={context ? `${label} — ${context}` : label}
        onClick={() => setOpen((value) => !value)}
        className="accordion-trigger group inline-flex items-center gap-3 transition-colors duration-200 motion-reduce:transition-none"
      >
        {label}
        <span
          aria-hidden="true"
          className={`inline-block text-[var(--accent)] transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "rotate-45" : "rotate-0"}`}
        >
          +
        </span>
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        aria-hidden={!open}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="accordion-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
