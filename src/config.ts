import profileData from "./data/profile.json";
import paletteData from "./data/palette.json";
import { defaultFlags } from "../shared/config";
import type { Palette, Profile, SiteConfig } from "../shared/config";

/**
 * Content the app renders from. The edge middleware injects the published
 * config into the document; when it hasn't (no Worker in `vite dev`, or nothing
 * published yet) this falls back to the JSON committed in the repo, which is
 * what Vite already baked into the HTML. Either way the page renders the same
 * shape, so there is no loading state and no flash.
 */
function injected(): SiteConfig | null {
  if (typeof document === "undefined") return null;
  const element = document.getElementById("live-config");
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent) as SiteConfig;
  } catch {
    // A malformed blob is ignored rather than thrown: the fallback is valid.
    return null;
  }
}

const fallback: SiteConfig = {
  profile: profileData as Profile,
  palette: paletteData as Palette,
  flags: defaultFlags,
};

export const config: SiteConfig = injected() ?? fallback;
export const profile = config.profile;
export const flags = config.flags;
