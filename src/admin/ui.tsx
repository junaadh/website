import type { ReactNode } from "react";

export const Panel = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="border border-line bg-surface">
    <header className="border-b border-line px-5 py-4">
      <h2 className="font-mono text-[12px] tracking-[1.3px] text-accent uppercase">
        {title}
      </h2>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

export const Button = ({
  children,
  variant = "ghost",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center gap-2 border px-4 py-2 text-[13px] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
      variant === "primary"
        ? "border-accent bg-accent text-on-accent hover:bg-accent-hover"
        : variant === "danger"
          ? "border-line text-muted hover:border-strong-line hover:text-fg"
          : "border-visual-line text-secondary hover:border-strong-line hover:text-accent"
    } ${props.className ?? ""}`}
  >
    {children}
  </button>
);

export function Field({
  label,
  value,
  onChange,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  mono?: boolean;
}) {
  const shared = `w-full border border-visual-line bg-visual-bg px-3 py-2 text-[13px] text-fg outline-none transition-colors duration-200 focus:border-strong-line ${mono ? "font-mono" : ""}`;
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[1px] text-muted uppercase">
        {label}
      </span>
      {multiline ? (
        <textarea
          className={`${shared} min-h-[92px] resize-y leading-[1.6]`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <input
          className={shared}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      )}
    </label>
  );
}

export const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start gap-3 border border-visual-line p-3 transition-colors duration-200 hover:border-strong-line">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-[3px] size-4 shrink-0 accent-[var(--accent)]"
    />
    <span className="flex flex-col gap-[3px]">
      <span className="text-[13px] text-fg">{label}</span>
      <span className="text-[12px] text-muted">{hint}</span>
    </span>
  </label>
);

export const Notice = ({
  kind,
  children,
}: {
  kind: "error" | "ok";
  children: ReactNode;
}) => (
  <div
    role="status"
    className={`border px-4 py-3 text-[13px] ${
      kind === "error"
        ? "border-[#d0453f] bg-[#d0453f14] text-fg"
        : "border-strong-line bg-cell text-fg"
    }`}
  >
    {children}
  </div>
);
