// Page metadata in one place, so every page names itself the same way: a title
// (the root layout adds " · <name>"), a canonical URL, and matching Open Graph
// and Twitter cards. The preview image comes from the opengraph-image and
// twitter-image files of the nearest route segment.

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
  /** A parent segment's image, for pages without their own opengraph-image:
   *  setting openGraph here would otherwise drop the inherited one. */
  image?: string;
}): Metadata {
  const url = canonical(path);
  const images = image
    ? [{ url: image, width: 1200, height: 630, type: "image/png", alt: fullTitle(title) }]
    : undefined;
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
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle(title),
      description,
      ...(images && { images }),
    },
  };
}
