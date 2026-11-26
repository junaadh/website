import { card, hostOf, OG_SIZE, OG_TYPE } from "@/lib/og";
import { profile } from "@/lib/profile";

export const alt = `${profile.person.name}: ${profile.person.title}`;
export const size = OG_SIZE;
export const dynamic = "force-static"; // required by output: "export"
export const contentType = OG_TYPE;

export default function Image() {
  const { person, meta } = profile;
  return card({
    kicker: `${person.title} // ${person.location}`,
    title: person.name,
    subtitle: meta.description,
    footer: hostOf(),
  });
}
