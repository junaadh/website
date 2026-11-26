// Share images as plain .png files (/og/home.png, /og/work-eitri.png, ...).
// They used to be opengraph-image routes, which the static export writes
// without an extension and with a ?hash in the URL; iMessage's previewer
// skipped those. These are drawn at build time by the same card().

import { card, hostOf } from "@/lib/og";
import { bySlug, code, profile, projects } from "@/lib/profile";

export const dynamic = "force-static"; // required by output: "export"
export const dynamicParams = false;

export const generateStaticParams = () => [
  { file: "home.png" },
  { file: "card.png" },
  { file: "docs.png" },
  ...projects.map((p) => ({ file: `work-${p.slug}.png` })),
];

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = (await params).file.replace(/\.png$/, "");
  const { person, meta } = profile;
  if (name === "home")
    return card({
      kicker: `${person.title} // ${person.location}`,
      title: person.name,
      subtitle: meta.description,
      footer: hostOf(),
    });
  if (name === "card")
    return card({
      kicker: "Tool // GitHub card studio",
      title: "Card studio",
      subtitle: "Design a GitHub profile card with Eitri and embed it as an SVG.",
      tags: ["Eitri", "SVG", "README embed"],
      footer: hostOf("/card"),
    });
  if (name === "docs")
    return card({
      kicker: "Docs // Eitri console",
      title: "Documentation",
      subtitle: "The console, the Eitri language, the SDK reference and the card HTTP API.",
      tags: ["Console", "Language", "SDK", "Card API"],
      footer: hostOf("/docs"),
    });
  const p = bySlug(name.replace(/^work-/, ""));
  if (!p) return new Response("not found", { status: 404 });
  return card({
    kicker: `${code(p)} // ${p.kind}`,
    title: p.name,
    subtitle: p.summary,
    tags: p.stack,
    footer: hostOf(`/work/${p.slug}`),
  });
}
