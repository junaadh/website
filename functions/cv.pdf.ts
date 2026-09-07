import type { Env } from "./lib/store";

type CvEnv = Env & { MEDIA?: R2Bucket };

/**
 * Serves the résumé from R2 when CI has published a fresher copy there, and
 * otherwise falls through to the PDF baked into the deployment. Typst is a
 * native binary and cannot run in a Worker (its WASM build is ~10 MB gzipped,
 * past the Workers limit), so the rebuild happens in CI and lands here.
 *
 * The static copy is always valid, so an empty or unreachable bucket degrades
 * to exactly today's behaviour.
 */
export const onRequest: PagesFunction<CvEnv> = async (context) => {
  if (context.request.method !== "GET" && context.request.method !== "HEAD")
    return context.next();
  if (!context.env.MEDIA) return context.next();

  let object: R2ObjectBody | null = null;
  try {
    object = await context.env.MEDIA.get("cv.pdf");
  } catch {
    return context.next();
  }
  if (!object) return context.next();

  const headers = new Headers({
    "content-type": "application/pdf",
    // Matches public/_headers: the URL is stable, so it must revalidate.
    "cache-control": "public, max-age=0, must-revalidate",
    etag: object.httpEtag,
  });
  return new Response(
    context.request.method === "HEAD" ? null : object.body,
    { headers },
  );
};
