import { card, hostOf, OG_SIZE, OG_TYPE } from "@/lib/og";

export const alt = "Documentation: the console, the Eitri language, the SDK and the card API";
export const size = OG_SIZE;
export const dynamic = "force-static"; // required by output: "export"
export const contentType = OG_TYPE;

export default function Image() {
  return card({
    kicker: "Docs // Eitri console",
    title: "Documentation",
    subtitle: "The console, the Eitri language, the SDK reference and the card HTTP API.",
    tags: ["Console", "Language", "SDK", "Card API"],
    footer: hostOf("/docs"),
  });
}
