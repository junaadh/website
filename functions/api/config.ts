import { authenticated, ensureSchema, json } from "../lib/auth";
import type { AuthEnv } from "../lib/auth";
import { readConfig, writeConfig } from "../lib/store";
import { defaultFlags, validate } from "../../shared/config";
import type { Palette, Profile } from "../../shared/config";
import profileSeed from "../../src/data/profile.json";
import paletteSeed from "../../src/data/palette.json";

/* The committed JSON is the seed, so the editor always opens on the same content
   the site is currently rendering — even before anything has been published. */
const seed = () => ({
  profile: profileSeed as Profile,
  palette: paletteSeed as Palette,
  flags: { ...defaultFlags },
});

/** Readable without a session: it is exactly what the public page already shows. */
export const onRequestGet: PagesFunction<AuthEnv> = async ({ env }) => {
  const published = await readConfig(env);
  return json({
    version: published?.version ?? 0,
    published: !!published,
    config: published?.config ?? seed(),
  });
};

export const onRequestPut: PagesFunction<AuthEnv> = async ({ request, env }) => {
  await ensureSchema(env.AUTH);
  if (!(await authenticated(request, env)))
    return json({ error: "not signed in" }, 401);

  const body = await request.json().catch(() => null);
  const result = validate(body);
  // Reject at the door, so nothing invalid can ever reach a render path.
  if (!result.ok) return json({ error: "invalid config", errors: result.errors }, 422);

  return json({ version: await writeConfig(env, result.config), published: true });
};
