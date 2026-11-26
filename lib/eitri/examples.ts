// Example scripts for the console. Each one is copied verbatim from the
// eitri repo's crates/eitri-wasm/js/smoke.test.mjs, where it runs against
// the real wasm with its effects asserted, so they are known to compile.

export interface Example {
  id: string;
  title: string;
  source: string;
}

/** What the editor shows before a visitor has written anything. */
export const DEFAULT_SCRIPT = `import site from "site"

// This page runs Eitri. Change something and press Cmd+Enter.
site.hue(195)
site.weather(.Clear)
site.print("hello from \${site.projects.len()} projects")
`;

export const EXAMPLES: Example[] = [
  {
    id: "nightMode",
    title: "Night mode (Maldives time)",
    source:
      'import site from "site"\n\n// After dark (8pm to 6am, Maldives time) the page goes violet and stormy.\nlet t = site.time\nif t.hour >= 20 || t.hour < 6 {\n    site.hue(270)\n    site.weather(.Storm)\n    site.scanlines(true)\n    site.glow(80)\n    site.toast("night mode, it is ${t.hour}:${t.minute}")\n} else {\n    site.hue(190)\n    site.weather(.Clear)\n    site.toast("daylight")\n}\n',
  },
  {
    id: "newestFirst",
    title: "Newest first",
    source:
      'import site from "site"\n\n// Sort projects by year, newest first (insertion sort), then order them.\nlet sorted: []string = []\nlet years: []i64 = []\nfor p in site.projects {\n    var at = sorted.len()\n    while at > 0 && years[at - 1] < p.year {\n        at -= 1\n    }\n    sorted.insert(at, p.slug)\n    years.insert(at, p.year)\n}\nsite.order(sorted)\nsite.print("newest first: ${sorted[0]}")\n',
  },
  {
    id: "hideArchived",
    title: "Hide archived",
    source:
      'import site from "site"\n\n// Tidy up: hide everything that has been archived.\nvar hidden = 0\nfor p in site.projects {\n    match p.status {\n        .Archived => {\n            site.hide(p.slug)\n            hidden += 1\n        }\n        _ => {}\n    }\n}\nsite.toast("hid ${hidden} archived project(s)")\n',
  },
  {
    id: "weekdayRainbow",
    title: "A colour per weekday",
    source:
      'import site from "site"\n\n// A different accent colour for every day of the week.\nlet day = site.time.weekday\nsite.hue(day * 51)\nsite.glow(40 + day * 8)\nsite.grid(24)\nsite.print("weekday ${day}, hue ${day * 51}")\n',
  },
  {
    id: "rustSpotlight",
    title: "Spotlight Rust",
    source:
      'import site from "site"\n\n// Spotlight every project built with Rust, and put them first.\nlet rusty: []string = []\nfor p in site.projects {\n    if p.stack.contains("Rust") {\n        site.highlight(p.slug)\n        rusty.push(p.slug)\n    }\n}\nsite.order(rusty)\nsite.mono(true)\nsite.print("${rusty.len()} Rust projects")\n',
  },
  {
    id: "welcomeBack",
    title: "Welcome back",
    source:
      'import site from "site"\n\n// Greet people differently the more often they come back.\nlet n = site.visits\nif n <= 1 {\n    site.title("Welcome")\n    site.toast("first visit, hello!")\n} else if n < 5 {\n    site.title("Welcome back")\n    site.toast("visit #${n}")\n} else {\n    site.title("Good to see you again")\n    site.weather(.Aurora)\n    site.toast("visit #${n}, you are a regular")\n}\n',
  },
];
