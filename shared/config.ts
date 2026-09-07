/**
 * The shape of everything the admin panel can publish, shared by the React app
 * and the Pages Functions. Keep this module isomorphic — no DOM, no Workers
 * globals — so both bundles can import it.
 */

export type Experience = {
  company: string;
  role: string;
  period: string;
  current: boolean;
  location: string;
  tags: string[];
  summary: string;
  bullets: string[];
};

export type Project = {
  name: string;
  category: string;
  label: string;
  description: string;
  tags: string[];
  url: string;
  motif: string;
  cv: boolean;
  bullets: string[];
};

export type Skill = { name: string; description: string; items: string[] };

export type Education = {
  institution: string;
  period: string;
  qualification: string;
  details: string;
  location: string;
};

export type Social = {
  title: string;
  description: string;
  headline: string[];
  label: string;
  imageAlt: string;
};

export type Profile = {
  name: string;
  handle: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  github: string;
  summary: string;
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  education: Education[];
  languages: string[];
  stack: string[];
  about: string;
  social: Social;
  commonName: string;
  fullName: string;
};

/** Drives the work filters. A category outside this list would be unreachable. */
export const categories = ["Systems", "Full stack", "Native"] as const;

/** Each motif selects a hand-drawn graphic in ProjectGraphic (src/App.tsx).
    Anything unrecognised silently renders the ":helix" wordmark instead. */
export const motifs = [
  "compiler",
  "asm",
  "auth",
  "commerce",
  "requests",
  "native",
  "editor",
] as const;

/** The 16 colour tokens each theme defines; see src/index.css. */
export const tokenNames = [
  "bg",
  "fg",
  "secondary",
  "muted",
  "faint",
  "accent",
  "accent-hover",
  "on-accent",
  "surface",
  "line",
  "visual-bg",
  "visual-deep",
  "visual-line",
  "strong-line",
  "cell-bg",
  "dot-grid",
] as const;

export type Theme = Record<(typeof tokenNames)[number], string>;
export type Palette = { dark: Theme; light: Theme };

export type Flags = {
  marquee: boolean;
  sectionNav: boolean;
  commandPalette: boolean;
  byteInspector: boolean;
};

export const defaultFlags: Flags = {
  marquee: true,
  sectionNav: true,
  commandPalette: true,
  byteInspector: true,
};

export type SiteConfig = {
  profile: Profile;
  palette: Palette;
  flags: Flags;
};

/* -------------------------------------------------------------- validation --
   Hand-rolled rather than a schema library: this runs on every admin write
   inside a Worker, the shapes are fixed and few, and it keeps the bundle free
   of a dependency. Returns every problem at once so the panel can show them. */

type Path = string;
const fail = (errors: string[], at: Path, want: string) =>
  errors.push(`${at}: expected ${want}`);

const isString = (value: unknown): value is string => typeof value === "string";

function str(errors: string[], value: unknown, at: Path) {
  if (!isString(value) || !value.trim()) fail(errors, at, "a non-empty string");
}
function bool(errors: string[], value: unknown, at: Path) {
  if (typeof value !== "boolean") fail(errors, at, "a boolean");
}
function strList(errors: string[], value: unknown, at: Path) {
  if (!Array.isArray(value) || !value.every(isString))
    return fail(errors, at, "an array of strings");
}
function list(
  errors: string[],
  value: unknown,
  at: Path,
  each: (errors: string[], item: unknown, at: Path) => void,
) {
  if (!Array.isArray(value) || value.length === 0)
    return fail(errors, at, "a non-empty array");
  value.forEach((item, index) => each(errors, item, `${at}[${index}]`));
}
const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function theme(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  for (const token of tokenNames) {
    const colour = it[token];
    // Hex only: these land in a stylesheet, so reject anything that could carry
    // a url() or expression into the page.
    if (!isString(colour) || !/^#[0-9a-fA-F]{3,8}$/.test(colour))
      fail(errors, `${at}.${token}`, "a hex colour");
  }
}

function experience(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  str(errors, it.company, `${at}.company`);
  str(errors, it.role, `${at}.role`);
  str(errors, it.period, `${at}.period`);
  str(errors, it.location, `${at}.location`);
  str(errors, it.summary, `${at}.summary`);
  bool(errors, it.current, `${at}.current`);
  strList(errors, it.tags, `${at}.tags`);
  strList(errors, it.bullets, `${at}.bullets`);
}

function project(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  for (const key of ["name", "label", "description"])
    str(errors, it[key], `${at}.${key}`);
  // Both drive rendering by exact match, so a typo would fail silently.
  if (!categories.includes(it.category as (typeof categories)[number]))
    fail(errors, `${at}.category`, `one of ${categories.join(", ")}`);
  if (!motifs.includes(it.motif as (typeof motifs)[number]))
    fail(errors, `${at}.motif`, `one of ${motifs.join(", ")}`);
  // The URL is rendered into an href; only absolute http(s) is allowed.
  if (!isString(it.url) || !/^https?:\/\//.test(it.url))
    fail(errors, `${at}.url`, "an http(s) URL");
  bool(errors, it.cv, `${at}.cv`);
  strList(errors, it.tags, `${at}.tags`);
  strList(errors, it.bullets, `${at}.bullets`);
}

function skill(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  str(errors, it.name, `${at}.name`);
  str(errors, it.description, `${at}.description`);
  strList(errors, it.items, `${at}.items`);
}

function education(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  for (const key of ["institution", "period", "qualification", "details"])
    str(errors, it[key], `${at}.${key}`);
}

function profile(errors: string[], value: unknown, at: Path) {
  const it = object(value);
  if (!it) return fail(errors, at, "an object");
  for (const key of [
    "name",
    "handle",
    "title",
    "location",
    "email",
    "phone",
    "summary",
    "about",
    "commonName",
    "fullName",
  ])
    str(errors, it[key], `${at}.${key}`);
  if (!isString(it.website) || !/^https?:\/\//.test(it.website))
    fail(errors, `${at}.website`, "an http(s) URL");
  /* Not just any URL: this builds the avatar src, the JSON-LD sameAs, and the
     owner the CV rebuild dispatches to. Pin it to a bare GitHub profile so
     admin-editable content cannot steer any of them. */
  if (
    !isString(it.github) ||
    !/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(
      it.github,
    )
  )
    fail(errors, `${at}.github`, "a GitHub profile URL (https://github.com/<user>)");
  strList(errors, it.languages, `${at}.languages`);
  strList(errors, it.stack, `${at}.stack`);
  list(errors, it.experience, `${at}.experience`, experience);
  list(errors, it.projects, `${at}.projects`, project);
  list(errors, it.skills, `${at}.skills`, skill);
  list(errors, it.education, `${at}.education`, education);

  const social = object(it.social);
  if (!social) return fail(errors, `${at}.social`, "an object");
  for (const key of ["title", "description", "label", "imageAlt"])
    str(errors, social[key], `${at}.social.${key}`);
  strList(errors, social.headline, `${at}.social.headline`);

  // The site renders exactly two headline lines and one current role.
  if (Array.isArray(social.headline) && social.headline.length !== 2)
    fail(errors, `${at}.social.headline`, "exactly 2 lines");
  if (
    Array.isArray(it.experience) &&
    it.experience.filter((job) => object(job)?.current === true).length > 1
  )
    fail(errors, `${at}.experience`, "at most one entry with current: true");
}

export type Validation =
  | { ok: true; config: SiteConfig }
  | { ok: false; errors: string[] };

/** Validates an untrusted blob before it is ever stored or rendered. */
export function validate(value: unknown): Validation {
  const errors: string[] = [];
  const it = object(value);
  if (!it) return { ok: false, errors: ["root: expected an object"] };

  profile(errors, it.profile, "profile");

  const palette = object(it.palette);
  if (!palette) fail(errors, "palette", "an object");
  else {
    theme(errors, palette.dark, "palette.dark");
    theme(errors, palette.light, "palette.light");
  }

  const flags = object(it.flags);
  if (!flags) fail(errors, "flags", "an object");
  else
    for (const key of Object.keys(defaultFlags) as (keyof Flags)[])
      bool(errors, flags[key], `flags.${key}`);

  return errors.length
    ? { ok: false, errors }
    : { ok: true, config: it as unknown as SiteConfig };
}
