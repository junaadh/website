// Page metadata in one place, so every page names itself the same way: a title
// (the root layout adds " · <name>"), a canonical URL, and matching Open Graph
// and Twitter cards with a share image from /og/.

import type { Metadata } from "next";
import { profile } from "./profile";

export const SITE_URL = profile.links.website;
export const SITE_NAME = new URL(SITE_URL).host;

/** Every skill on the profile, once, for the keywords tag. */
export const KEYWORDS = [...new Set(profile.skills.flatMap((g) => g.items))];

/** Paths are written with a trailing slash, as the static export serves them. */
export const canonical = (path: string) => (path.endsWith("/") ? path : `${path}/`);

export const fullTitle = (title: string) => `${title} · ${profile.person.name}`;

export function pageMeta({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  /** The share image, a file under /og/ (see app/og/[file]/route.tsx). */
  image?: string;
}): Metadata {
  const url = canonical(path);
  const images = [ogImage(image ?? "home", fullTitle(title))];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      title: fullTitle(title),
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle(title),
      description,
      images,
    },
  };
}

/** A share image drawn by app/og/[file]/route.tsx, e.g. ogImage("work-eitri"). */
export function ogImage(name: string, alt: string) {
  return { url: `/og/${name}.png`, width: 1200, height: 630, type: "image/png", alt };
}
