import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultFlags, validate } from "../shared/config.ts";

const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"),
  );

/** The committed data is the fallback the site renders when KV is empty. */
const live = () => ({
  profile: read("profile"),
  palette: read("palette"),
  flags: { ...defaultFlags },
});

test("the committed profile and palette validate as-is", () => {
  const result = validate(live());
  assert.equal(
    result.ok,
    true,
    result.ok ? "" : `fallback data is invalid:\n${result.errors.join("\n")}`,
  );
});

test("every missing or malformed field is reported by path", () => {
  const config = live();
  delete config.profile.email;
  config.profile.experience[0].bullets = "not a list";
  config.palette.dark.accent = "rebeccapurple";
  const result = validate(config);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.some((e) => e.startsWith("profile.email:")));
  assert.ok(
    result.errors.some((e) => e.startsWith("profile.experience[0].bullets:")),
  );
  assert.ok(result.errors.some((e) => e.startsWith("palette.dark.accent:")));
});

test("colours are hex-only, so nothing can smuggle CSS into the page", () => {
  for (const attempt of [
    "red",
    "url(x)",
    "#fff; background: url(//evil)",
    "var(--x)",
  ]) {
    const config = live();
    config.palette.light.bg = attempt;
    const result = validate(config);
    assert.equal(result.ok, false, `${attempt} should be rejected`);
  }
});

test("project URLs must be absolute http(s)", () => {
  for (const attempt of ["javascript:alert(1)", "/relative", "data:text/html,x"]) {
    const config = live();
    config.profile.projects[0].url = attempt;
    const result = validate(config);
    assert.equal(result.ok, false, `${attempt} should be rejected`);
  }
});

test("shapes the site actually depends on are enforced", () => {
  const twoCurrent = live();
  twoCurrent.profile.experience.forEach(
    (job: { current: boolean }) => (job.current = true),
  );
  assert.equal(validate(twoCurrent).ok, false, "only one role can be current");

  const headline = live();
  headline.profile.social.headline = ["only one line"];
  assert.equal(validate(headline).ok, false, "the hero renders exactly 2 lines");

  const empty = live();
  empty.profile.projects = [];
  assert.equal(validate(empty).ok, false, "empty lists would render nothing");
});

test("profile.github must be a bare GitHub profile URL", () => {
  for (const attempt of [
    "https://github.com/../../evil",
    "https://github.com/user/repo",
    "https://gitlab.com/user",
    "http://github.com/user",
    "https://github.com/",
    "https://github.com/-bad",
  ]) {
    const config = live();
    config.profile.github = attempt;
    assert.equal(validate(config).ok, false, `${attempt} should be rejected`);
  }
  const ok = live();
  ok.profile.github = "https://github.com/junaadh";
  assert.equal(validate(ok).ok, true);
});

test("a config published before a flag existed still validates", () => {
  const config = live();
  // What production is serving right now: no `terminal` key at all.
  delete config.flags.terminal;
  const result = validate(config);
  assert.equal(
    result.ok,
    true,
    result.ok ? "" : `older blob rejected:\n${result.errors.join("\n")}`,
  );
  if (result.ok)
    assert.equal(
      result.config.flags.terminal,
      true,
      "missing flags should take their default, not become undefined",
    );

  // Present but wrong type is still an error.
  const wrong = live();
  (wrong.flags as Record<string, unknown>).terminal = "yes";
  assert.equal(validate(wrong).ok, false);
});
