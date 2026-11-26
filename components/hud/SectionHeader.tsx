import { Scramble } from "./Scramble";

export function SectionHeader({ index, title, id }: { index: string; title: string; id: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="label text-signal">{index}</span>
      <h2 id={id} className="label text-ink-2">
        <Scramble text={`// ${title}`} initial={false} duration={600} />
      </h2>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent"
      />
    </div>
  );
}
