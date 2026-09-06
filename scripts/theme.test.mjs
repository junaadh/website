import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const source = readFileSync(
  new URL("../public/theme.js", import.meta.url),
  "utf8",
);
function browser({ saved = null, dark = true, blocked = false } = {}) {
  const listeners = {};
  const root = { dataset: {}, style: {} };
  const media = {
    matches: dark,
    addEventListener(_type, fn) {
      this.change = fn;
    },
  };
  const storage = new Map(saved ? [["portfolio-theme", saved]] : []);
  const window = {
    matchMedia: () => media,
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    dispatchEvent(event) {
      listeners[event.type]?.(event);
    },
  };
  const context = {
    window,
    document: {
      documentElement: root,
      querySelector: () => ({ setAttribute() {} }),
    },
    localStorage: {
      getItem(key) {
        if (blocked) throw Error();
        return storage.get(key);
      },
      setItem(key, value) {
        if (blocked) throw Error();
        storage.set(key, value);
      },
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
  };
  runInNewContext(source, context);
  return {
    root,
    storage,
    select(value) {
      window.dispatchEvent({ type: "portfolio-theme-change", detail: value });
    },
    system(value) {
      media.matches = value;
      media.change();
    },
    storageChange(value) {
      window.dispatchEvent({
        type: "storage",
        key: "portfolio-theme",
        newValue: value,
      });
    },
  };
}
test("Auto follows live system changes; manual selection overrides them and persists", () => {
  const b = browser();
  assert.equal(b.root.dataset.theme, "dark");
  b.system(false);
  assert.equal(b.root.dataset.theme, "light");
  b.select("dark");
  assert.equal(b.storage.get("portfolio-theme"), "dark");
  b.system(false);
  assert.equal(b.root.dataset.theme, "dark");
  b.select("auto");
  assert.equal(b.root.dataset.theme, "light");
  b.system(true);
  assert.equal(b.root.dataset.theme, "dark");
});
test("saved light wins on first paint, before React runs", () => {
  const b = browser({ saved: "light" });
  assert.equal(b.root.dataset.theme, "light");
  assert.equal(b.root.style.colorScheme, "light");
});
test("blocked storage still permits manual themes and automatic changes", () => {
  const b = browser({ blocked: true });
  b.select("light");
  assert.equal(b.root.dataset.theme, "light");
  b.select("auto");
  b.system(false);
  assert.equal(b.root.dataset.theme, "light");
});
test("invalid stored values fall back to Auto; cross-tab reset restores system tracking", () => {
  const b = browser({ saved: "unexpected" });
  assert.equal(b.root.dataset.themePreference, "auto");
  b.storageChange("light");
  assert.equal(b.root.dataset.theme, "light");
  b.storageChange(null);
  assert.equal(b.root.dataset.theme, "dark");
});

// The card generator reads palette.json; the site reads index.css. Keep them equal.
test("palette.json matches the tokens index.css ships", () => {
  const palette = JSON.parse(
    readFileSync(new URL("../src/data/palette.json", import.meta.url), "utf8"),
  );
  const css = readFileSync(
    new URL("../src/index.css", import.meta.url),
    "utf8",
  );
  const tokens = (selector) => {
    const start = css.indexOf(selector);
    assert.notEqual(start, -1, `index.css is missing ${selector}`);
    const body = css.slice(start, css.indexOf("}", start));
    return Object.fromEntries(
      [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [
        k,
        v.trim(),
      ]),
    );
  };
  for (const [theme, selector] of [
    ["dark", ":root {"],
    ["light", ':root[data-theme="light"] {'],
  ]) {
    const found = tokens(selector);
    for (const [name, value] of Object.entries(palette[theme]))
      assert.equal(found[name], value, `${theme} --${name} drifted`);
  }
});
