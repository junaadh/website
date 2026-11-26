import { notFound } from "next/navigation";
import { card, hostOf, OG_SIZE, OG_TYPE } from "@/lib/og";
import { bySlug, code, projects } from "@/lib/profile";

export const alt = "A project on junaadh.com";
export const size = OG_SIZE;
export const dynamic = "force-static"; // required by output: "export"
export const contentType = OG_TYPE;

export const generateStaticParams = () => projects.map((p) => ({ slug: p.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = bySlug((await params).slug);
  if (!p) notFound();
  return card({
    kicker: `${code(p)} // ${p.kind}`,
    title: p.name,
    subtitle: p.summary,
    tags: p.stack,
    footer: hostOf(`/work/${p.slug}`),
  });
}
