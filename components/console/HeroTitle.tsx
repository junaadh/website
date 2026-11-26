"use client";

import { Scramble } from "@/components/hud/Scramble";
import { useContent } from "./engine-context";

// The hero name. Server HTML carries the real name; a script can replace it.
export function HeroTitle({ name }: { name: string }) {
  const { title } = useContent();
  return <Scramble text={title ?? name} />;
}
