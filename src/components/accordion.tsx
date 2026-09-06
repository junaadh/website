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
    <div className="mt-4">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={context ? `${label} — ${context}` : label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-3 border-0 bg-transparent py-2 text-left text-[13px] text-secondary transition-colors duration-200 hover:text-accent active:text-accent"
      >
        {label}
        <span
          aria-hidden="true"
          className={`inline-block text-accent transition-transform duration-300 ease-[var(--ease-spring)] ${open ? "rotate-45" : "rotate-0"}`}
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
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-settle)] ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-[5px] pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
