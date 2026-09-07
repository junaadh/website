import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The profile a build should render from.
 *
 * When SITE_CONFIG_URL is set, the published config wins — so a rebuild
 * triggered from the admin panel produces a CV and social card matching what is
 * actually live, not what happens to be committed. Any failure (unset, offline,
 * nothing published yet, malformed) falls back to the committed JSON, because a
 * build must never break on a network blip.
 */
export async function resolveProfile(root) {
  const committed = JSON.parse(
    await readFile(path.join(root, "src/data/profile.json"), "utf8"),
  );
  const url = process.env.SITE_CONFIG_URL;
  if (!url) return { profile: committed, source: "committed" };

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body?.published || !body?.config?.profile)
      throw new Error("nothing published yet");
    return { profile: body.config.profile, source: `published v${body.version}` };
  } catch (error) {
    console.warn(
      `  Live config unavailable (${error.message}); using the committed profile.`,
    );
    return { profile: committed, source: "committed" };
  }
}
