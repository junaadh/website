import { encodeScript } from "@/lib/card/share";
import { renderCardFailure, renderCardSvg, svgDataUrl } from "@/lib/docs/render";
import { diagnostic, sample } from "@/lib/docs/samples";
import { CardPreview } from "./CardPreview";
import { CodeBlock } from "./CodeBlock";

/** The studio link for a script: its source in ?s=, plus the sample's parameters. */
export async function studioLink(source: string, params: Record<string, string> = {}) {
  const encoded = await encodeScript(source);
  const q = new URLSearchParams(params);
  const query = [encoded ? `s=${encoded}` : "", q.toString()].filter(Boolean).join("&");
  return `/card/${query ? `?${query}` : ""}`;
}

/**
 * A sample from lib/docs/samples.ts. Site samples get "Run in console"; card
 * samples get "Open in card studio" and the card they draw.
 */
export async function Sample({ id, preview = true }: { id: string; preview?: boolean }) {
  const s = sample(id);
  if (s.kind === "site") return <CodeBlock code={s.source} label={s.title} run />;
  const href = await studioLink(s.source, s.params);
  const svg = preview ? svgDataUrl(await renderCardSvg(s.source, s.params)) : null;
  return (
    <>
      <CodeBlock code={s.source} label={s.title} studioHref={href} />
      {svg && <CardPreview src={svg} alt={`The card drawn by "${s.title}"`} />}
    </>
  );
}

/**
 * A script that fails, with the report the wasm prints for it. A card script's
 * failure is also shown as the image the API would serve.
 */
export async function Diagnostic({ id }: { id: string }) {
  const d = diagnostic(id);
  if (d.kind === "card") {
    const image = svgDataUrl(await renderCardFailure(d.source));
    return (
      <>
        <CodeBlock code={d.source} label={d.title} studioHref={await studioLink(d.source)} />
        <CodeBlock code={d.report} label="Report" language="text" tone="err" />
        <CardPreview
          src={image}
          alt="The error card drawn in place of the image"
          caption="What the README shows"
        />
      </>
    );
  }
  return (
    <>
      <CodeBlock code={d.source} label={d.title} run />
      <CodeBlock code={d.report} label="Output" language="text" tone="err" />
    </>
  );
}
