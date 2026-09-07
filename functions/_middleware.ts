import { readConfig } from "./lib/store";
import type { Env, Published } from "./lib/store";
import { tokenNames } from "../shared/config";
import { terminalResume, wantsTerminal, whoami } from "./lib/terminal";
import profileSeed from "../src/data/profile.json";
import type { Profile as SeedProfile } from "../shared/config";
import type { Profile, SiteConfig } from "../shared/config";

/* Rewrites the static HTML at the edge so published content reaches crawlers in
   the initial response, rather than after a client-side fetch. When nothing has
   been published this is a straight pass-through: the page Vite built already
   carries the committed data. */

/** JSON destined for a <script> body; `<` must not close the tag early. */
const inlineJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

function structuredData(profile: Profile) {
  const current = profile.experience.find((job) => job.current);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: profile.website,
    jobTitle: profile.title,
    ...(current
      ? { worksFor: { "@type": "Organization", name: current.company } }
      : {}),
    sameAs: [profile.github, `https://x.com/${profile.handle}`],
    knowsAbout: profile.skills.flatMap((skill) => skill.items),
  };
}

/** Mirrors the :root blocks in src/index.css, overriding only the colours. */
function paletteStyle(config: SiteConfig) {
  const block = (theme: "dark" | "light") =>
    tokenNames
      .map((token) => `--${token}:${config.palette[theme][token]}`)
      .join(";");
  return `:root{${block("dark")}}:root[data-theme="light"]{${block("light")}}`;
}

const setAttribute = (name: string, value: string) => ({
  element(element: Element) {
    element.setAttribute(name, value);
  },
});

const setText = (value: string) => ({
  element(element: Element) {
    element.setInnerContent(value);
  },
});

const setRaw = (value: string) => ({
  element(element: Element) {
    element.setInnerContent(value, { html: true });
  },
});

const appendTo = (html: string) => ({
  element(element: Element) {
    element.append(html, { html: true });
  },
});

function rewrite(response: Response, { config }: Published) {
  const { profile } = config;

  /* Replace the content attribute in place rather than appending tags:
     scripts/check-social.mjs asserts each of these appears exactly once. */
  const metas: [string, string][] = [
    ['meta[name="author"]', profile.name],
    ['meta[name="description"]', profile.social.description],
    ['meta[property="og:url"]', `${profile.website}/`],
    ['meta[property="og:title"]', profile.social.title],
    ['meta[property="og:description"]', profile.social.description],
    ['meta[property="og:site_name"]', profile.name],
    ['meta[property="og:image:alt"]', profile.social.imageAlt],
    ['meta[name="twitter:site"]', `@${profile.handle}`],
    ['meta[name="twitter:creator"]', `@${profile.handle}`],
    ['meta[name="twitter:title"]', profile.social.title],
    ['meta[name="twitter:description"]', profile.social.description],
    ['meta[name="twitter:image:alt"]', profile.social.imageAlt],
  ];

  let rewriter = new HTMLRewriter()
    .on("title", setText(profile.social.title))
    .on("link[rel=canonical]", setAttribute("href", `${profile.website}/`))
    .on(
      'script[type="application/ld+json"]',
      setRaw(inlineJson(structuredData(profile))),
    )
    .on(
      "head",
      appendTo(
        `<style id="live-palette">${paletteStyle(config)}</style>` +
          `<script type="application/json" id="live-config">${inlineJson(config)}</script>`,
      ),
    );
  for (const [selector, value] of metas)
    rewriter = rewriter.on(selector, setAttribute("content", value));
  return rewriter.transform(response);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  /* Shells get the résumé as ANSI text. Uses the published profile when there
     is one, else the copy built into the deployment. */
  const terminalPath = url.pathname === "/" || url.pathname === "/cv.txt";
  if (
    (terminalPath || url.pathname === "/whoami") &&
    wantsTerminal(context.request)
  ) {
    const live = await readConfig(context.env);
    const profile = live?.config.profile ?? (profileSeed as SeedProfile);
    return new Response(
      url.pathname === "/whoami"
        ? whoami(profile)
        : terminalResume(profile),
      {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      },
    );
  }

  /* The panel is its own page with its own title, and must never be cached or
     have the public site's metadata written over it. */
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin"))
    return context.next();

  const response = await context.next();
  if (!(response.headers.get("content-type") ?? "").includes("text/html"))
    return response;

  const published = await readConfig(context.env);
  if (!published) return response;

  if (context.request.method !== "GET" || url.search)
    return rewrite(response, published);

  /* Keyed by version, so publishing makes every old entry unreachable without a
     purge. Entries age out on their own. */
  const key = new Request(
    `${url.origin}${url.pathname}?__v=${published.version}`,
    { method: "GET" },
  );
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return hit;

  const rewritten = new Response(rewrite(response, published).body, response);
  rewritten.headers.set("cache-control", "public, max-age=0, must-revalidate");
  context.waitUntil(cache.put(key, rewritten.clone()));
  return rewritten;
};
