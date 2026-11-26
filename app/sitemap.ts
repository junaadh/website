import type { MetadataRoute } from "next";
import { docsNav } from "@/lib/docs/nav";
import { projects } from "@/lib/profile";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = docsNav().flatMap((g) => g.items.map((i) => i.href));
  const paths = ["/", "/card/", ...docs, ...projects.map((p) => `/work/${p.slug}/`)];
  return [...new Set(paths)].map((path) => ({
    url: `${SITE_URL}${path}`,
    priority: path === "/" ? 1 : path.startsWith("/work/") ? 0.8 : 0.5,
  }));
}
