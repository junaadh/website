import Link from "next/link";
import type { ReactNode } from "react";

/** Wraps the names of a module's own types in links to their entries. */
export function TypeText({ text, types }: { text: string; types: ReadonlySet<string> }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\b[A-Z]\w*\b/g)) {
    if (!types.has(m[0])) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={m.index}
        href={`#type-${m[0]}`}
        className="plain tk-ty underline decoration-line-strong underline-offset-2"
      >
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** `fn name(a: T, b: U) -> R`, coloured like the editor does. */
export function Signature({
  name,
  params,
  returns,
  types,
  href,
}: {
  name: string;
  params: { name: string; type: string }[];
  returns: string;
  types: ReadonlySet<string>;
  href?: string;
}) {
  return (
    <code className="!border-0 !bg-transparent !p-0 !text-xs">
      <span className="tk-kw">fn</span>{" "}
      {href ? (
        <Link href={href} className="plain tk-fn hover:underline">
          {name}
        </Link>
      ) : (
        <span className="tk-fn">{name}</span>
      )}
      <span className="tk-punct">(</span>
      {params.map((p, i) => (
        <span key={p.name}>
          {i > 0 && <span className="tk-punct">, </span>}
          <span className="tk-param">{p.name}</span>
          <span className="tk-punct">: </span>
          <TypeText text={p.type} types={types} />
        </span>
      ))}
      <span className="tk-punct">)</span> <span className="tk-op">-&gt;</span>{" "}
      <TypeText text={returns} types={types} />
    </code>
  );
}
