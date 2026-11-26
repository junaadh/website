"use client";

import { Scramble } from "@/components/hud/Scramble";
import { useSiteState } from "./SiteProvider";

// The hero name. Server HTML carries the real name; a script can replace it.
export function HeroTitle({ name }: { name: string }) {
  const { title } = useSiteState();
  return <Scramble text={title ?? name} />;
}
