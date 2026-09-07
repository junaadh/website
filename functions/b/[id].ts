import type { Env } from "../lib/store";

const encoder = new TextEncoder();

/**
 * Reopens the hero byte inspector with a shared string. Serves the normal page
 * and injects the value, so the link is a real page rather than a redirect —
 * `_middleware.ts` has already applied the live config by the time this runs.
 *
 * The share preview gets the string and its byte count in the title and
 * description. The *image* stays the standard card: rendering a per-link one
 * needs a rasteriser (resvg-wasm, ~925 kB gzipped) in the bundle that serves
 * every request, which is a poor trade for a preview thumbnail.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = String(context.params.id ?? "").slice(0, 12);
  const value =
    /^[a-z2-9]+$/.test(key) && context.env.CONFIG
      ? await context.env.CONFIG.get(`b:${key}`)
      : null;

  // Unknown or expired links fall back to the ordinary page.
  const page = await context.next(
    new Request(new URL("/", context.request.url), context.request),
  );
  if (!value) return page;

  const bytes = encoder.encode(value).length;
  const title = `"${value}" — ${bytes} byte${bytes === 1 ? "" : "s"}`;
  const description = `${value.length} character${value.length === 1 ? "" : "s"}, ${bytes} byte${bytes === 1 ? "" : "s"} of UTF-8. Open the inspector to see them.`;

  const setContent = (text: string) => ({
    element(element: Element) {
      element.setAttribute("content", text);
    },
  });

  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[name="twitter:description"]', setContent(description))
    .on("head", {
      element(element) {
        element.append(
          `<script type="application/json" id="byte-seed">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>` +
            // A shared toy link is not a page anyone should land on from
            // search; the canonical already in the page points at "/".
            `<meta name="robots" content="noindex" />`,
          { html: true },
        );
      },
    })
    .transform(page);
};
