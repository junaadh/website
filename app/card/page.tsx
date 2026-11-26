import type { Metadata } from "next";
import Link from "next/link";
import { CardStudio } from "@/components/card/CardStudio";
import { SectionHeader } from "@/components/hud/SectionHeader";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Card studio",
  description: "Design a GitHub profile card with Eitri and embed it as an SVG.",
  path: "/card/",
});

export default function CardPage() {
  return (
    <section aria-labelledby="card-title" className="pt-16 pb-12">
      <p className="label mb-6 flex items-center gap-3">
        <span className="text-signal">[ API ]</span> /api/card/&lt;user&gt;.svg
      </p>
      <h1 className="mb-4 text-4xl font-semibold tracking-tight">GitHub card studio</h1>
      <p className="mb-10 max-w-2xl text-ink-2">
        A card renderer for READMEs. Write the card in Eitri, preview it live, then embed the URL:
        the same script runs on the server and draws the same SVG.{" "}
        <Link
          href="/docs/card/"
          className="label whitespace-nowrap text-signal transition-colors hover:text-ink"
        >
          Docs ↗
        </Link>
      </p>
      <SectionHeader index="01" title="Studio" id="card-title" />
      <CardStudio />
    </section>
  );
}
