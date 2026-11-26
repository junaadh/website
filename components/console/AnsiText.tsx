import { parseAnsi } from "@/lib/eitri/ansi";

/** Text with ANSI colours (an Eitri report) as styled spans. */
export function AnsiText({ text }: { text: string }) {
  return (
    <>
      {parseAnsi(text).map((r) => (
        <span key={r.at} className={r.cls || undefined}>
          {r.text}
        </span>
      ))}
    </>
  );
}
