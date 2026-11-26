import { card, hostOf, OG_SIZE, OG_TYPE } from "@/lib/og";

export const alt = "Card studio: design a GitHub profile card with Eitri";
export const size = OG_SIZE;
export const dynamic = "force-static"; // required by output: "export"
export const contentType = OG_TYPE;

export default function Image() {
  return card({
    kicker: "Tool // GitHub card studio",
    title: "Card studio",
    subtitle: "Design a GitHub profile card with Eitri and embed it as an SVG.",
    tags: ["Eitri", "SVG", "README embed"],
    footer: hostOf("/card"),
  });
}
