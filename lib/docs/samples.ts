// Every code sample in the docs. Nothing is written inline in a page: pages refer
// to these by id, and scripts/check-docs.mjs (part of `bun run check`) runs each
// one against the real wasm, so a sample that stops compiling fails the check.
//
// "site" samples run against the site SDK with a fixed clock and the project
// list from content/profile.json. "card" samples run with lib/card/sample.ts's
// SAMPLE_USER (and `params`, when given). No imports here: node loads this file
// directly with type stripping.

export type SampleKind = "site" | "card";

export interface Sample {
  id: string;
  kind: SampleKind;
  title: string;
  source: string;
  /** Card samples: the ?name=value parameters the sample is shown with. */
  params?: Record<string, string>;
}

/** Scripts that are meant to fail: the docs show their diagnostics. */
export interface Diagnostic {
  id: string;
  title: string;
  /** Which runtime runs it; "site" when left out. */
  kind?: SampleKind;
  outcome: "compile" | "fault";
  source: string;
  /** The exact report the wasm prints, checked by scripts/check-docs.mjs. */
  report: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "quick-start",
    kind: "site",
    title: "A first script",
    source: `import site from "site"
import theme from "site/theme"

theme.hue(320)
theme.weather(.Rain)
site.title("hello, console")
site.print("projects: \${site.projects.len()}")
`,
  },
  {
    id: "example-hover-sparks",
    kind: "site",
    title: "Hover sparks",
    source: `import site from "site"
import fx from "site/fx"
import sound from "site/sound"

// Sparks fly off a project card when the pointer touches it, with a tiny
// blip. The event carries the card's slug; it is null for other events.
site.on("project.hover", e => {
    if let slug = e.slug {
        fx.sparks(slug)
        sound.beep(880, 40)
    }
})
`,
  },
  {
    id: "example-welcome-back",
    kind: "site",
    title: "Welcome back",
    source: `import site from "site"
import fx from "site/fx"
import ui from "site/ui"

// site.visits counts the page loads that replayed a saved script, this one
// included, so the first visit and the later ones can be told apart.
if site.visits <= 1 {
    fx.typeout("hello, first time here?")
} else {
    fx.typeout("welcome back, visit #\${site.visits}")
    ui.toast("good to see you again", .Info)
}
`,
  },
  {
    id: "lang-basics",
    kind: "site",
    title: "Bindings, functions and lambdas",
    source: `import site from "site"

let name = "Eitri"
var count = 0

fn greet(who: string) -> string {
    return "hello, \${who}"
}

let shout = (s: string) => s.to_upper()
let report = () => site.print("\${count} projects")

for p in site.projects {
    count += 1
}
site.print(greet(name))
site.print(shout("done"))
report()
`,
  },
  {
    id: "lang-control",
    kind: "site",
    title: "Conditions and loops",
    source: `import site from "site"

let hour = site.time.hour
let part = if hour < 12 {
    "morning"
} else if hour < 18 {
    "afternoon"
} else {
    "evening"
}

var tries = 0
while tries < 3 {
    tries += 1
}

var evens = 0
for n in 0..10 {
    if n % 2 == 0 {
        evens += 1
    }
}
site.print("\${part}: \${tries} tries, \${evens} even numbers")
`,
  },
  {
    id: "lang-match",
    kind: "site",
    title: "Enums and match",
    source: `import site from "site"
import theme from "site/theme"

fn mood(w: theme.Weather) -> string {
    return match w {
        .Rain => "wet"
        .Storm => "very wet"
        .Clear => "dry"
        _ => "unusual"
    }
}

site.print(mood(.Rain))
site.print(mood(.Aurora))
`,
  },
  {
    id: "lang-optionals",
    kind: "site",
    title: "Optionals",
    source: `import site from "site"

site.on("section", e => {
    if let name = e.section {
        site.print("now reading \${name}")
    } else {
        site.print("no section")
    }
    let key = e.key ?? "no key"
    site.print(key)
})
`,
  },
  {
    id: "lang-arrays",
    kind: "site",
    title: "Arrays",
    source: `import site from "site"

var names: []string = []
for p in site.projects {
    names.push(p.name)
}
names.insert(0, "first")

let has = names.contains("first")
site.print("\${names.len()} names, first is \${names[0]}, has it: \${has}")
`,
  },
  {
    id: "lang-structs",
    kind: "site",
    title: "Structs and qualified literals",
    source: `import site from "site"

struct Pair {
    left: i64
    right: i64
}

let pair = Pair { left: 3, right: 4 }

site.action(site.Action {
    name: "sum",
    title: "Sum a pair",
    description: "Prints left + right",
    category: "Docs",
    keywords: ["add"],
    run: () => site.print("\${pair.left + pair.right}"),
})
`,
  },
  {
    id: "site-content",
    kind: "site",
    title: "Changing the content",
    source: `import site from "site"

site.title("hello")
site.order(["eitri", "vyr"])
site.highlight("eitri")
site.badge("eitri", "MINE")
site.hide("helix-rpc")
site.readout("PROJECTS", "\${site.projects.len()}")
site.print("visit number \${site.visits}")
`,
  },
  {
    id: "site-actions",
    kind: "site",
    title: "Actions and invoke",
    source: `import site from "site"

site.action(site.Action {
    name: "ping",
    title: "Ping",
    description: "Print one line",
    category: "Docs",
    keywords: ["test"],
    run: () => site.print("pong"),
})

site.action(site.Action {
    name: "ping_twice",
    title: "Ping twice",
    description: "Run the ping action two times",
    category: "Docs",
    keywords: [],
    run: () => {
        site.invoke("ping")
        site.invoke("ping")
    },
})
`,
  },
  {
    id: "site-events",
    kind: "site",
    title: "Events",
    source: `import site from "site"

site.on("section", e => {
    if let name = e.section {
        site.readout("SECTION", name)
    }
})

site.on("key", e => {
    if let k = e.key {
        site.print("unbound key: \${k}")
    }
})

site.on("idle", e => site.print("idle for 30 seconds"))
`,
  },
  {
    id: "site-navigate",
    kind: "site",
    title: "Going places",
    source: `import site from "site"

site.action(site.Action {
    name: "tour",
    title: "Open the first project",
    description: "Scroll to the work section, then open a project",
    category: "Docs",
    keywords: [],
    run: () => {
        site.goto("work")
        site.open("eitri")
    },
})
`,
  },
  {
    id: "site-stop",
    kind: "site",
    title: "Stopping a script",
    source: `import site from "site"
import time from "site/time"

time.every(5000, () => site.print("tick"))

site.action(site.Action {
    name: "quiet",
    title: "Stop the script",
    description: "Drop the timer and this action",
    category: "Docs",
    keywords: [],
    run: () => site.stop(),
})
`,
  },
  {
    id: "theme-look",
    kind: "site",
    title: "A complete look",
    source: `import theme from "site/theme"

theme.hue(150)
theme.weather(.Aurora)
theme.grid(32)
theme.scanlines(false)
theme.glow(70)
theme.mono(false)
theme.crt(true)
theme.flicker(false)
theme.invert(false)
theme.cursor(.Ring)
theme.scale(110)
`,
  },
  {
    id: "fx-effects",
    kind: "site",
    title: "Effects from an action",
    source: `import site from "site"
import fx from "site/fx"

site.action(site.Action {
    name: "celebrate",
    title: "Celebrate",
    description: "Several one-shot effects at once",
    category: "Docs",
    keywords: ["party"],
    run: () => {
        fx.glitch(400)
        fx.shake(4)
        fx.flash()
        fx.sparks("")
        fx.scan()
        fx.decode()
        fx.typeout("well done")
    },
})
`,
  },
  {
    id: "ui-prompts",
    kind: "site",
    title: "Toast, banner, pick and input",
    source: `import site from "site"
import ui from "site/ui"

ui.banner("docs example is running")

site.action(site.Action {
    name: "jump",
    title: "Jump to a section",
    description: "Pick a section and scroll to it",
    category: "Docs",
    keywords: ["goto"],
    run: () => {
        ui.pick(ui.Pick {
            title: "Jump to",
            placeholder: "a section",
            items: [
                ui.Item { id: "work", title: "Work", subtitle: "projects", detail: "" },
                ui.Item { id: "log", title: "Log", subtitle: "experience", detail: "" },
                ui.Item { id: "contact", title: "Contact", subtitle: "uplink", detail: "" },
            ],
        }, choice => {
            if let id = choice {
                site.goto(id)
            }
        })
    },
})

site.action(site.Action {
    name: "rename",
    title: "Rename the hero",
    description: "Ask for a title",
    category: "Docs",
    keywords: [],
    run: () => {
        ui.input(ui.Input {
            title: "New title",
            placeholder: "up to 24 characters",
            value: "",
            confirm: "Apply",
        }, answer => {
            if let text = answer {
                site.title(text)
                ui.toast("renamed", .Ok)
            }
        })
    },
})
`,
  },
  {
    id: "keys-bindings",
    kind: "site",
    title: "Bindings, sequences and modes",
    source: `import site from "site"
import keys from "site/keys"

site.action(site.Action {
    name: "go_work",
    title: "Go to work",
    description: "",
    category: "Docs",
    keywords: [],
    run: () => site.goto("work"),
})

keys.bind("shift+w", "go_work")
keys.bind("g>w", "go_work")

keys.mode("nav", true)
keys.bind("nav/w", "go_work")
keys.bind("nav/q", "go_work")
keys.unbind("nav/q")
`,
  },
  {
    id: "time-timers",
    kind: "site",
    title: "Timers",
    source: `import site from "site"
import ui from "site/ui"
import time from "site/time"

var ticks = 0
var id = 0
id = time.every(1000, () => {
    ticks += 1
    site.readout("TICKS", "\${ticks}")
    if ticks == 10 {
        time.cancel(id)
    }
})

time.after(2000, () => ui.toast("two seconds in", .Info))
`,
  },
  {
    id: "sound-notes",
    kind: "site",
    title: "Beeps and chords",
    source: `import site from "site"
import sound from "site/sound"

site.action(site.Action {
    name: "chime",
    title: "Chime",
    description: "A short chord, then a beep",
    category: "Docs",
    keywords: [],
    run: () => {
        sound.chord([262, 330, 392], 400)
        sound.beep(880, 80)
    },
})
sound.mute(false)
`,
  },
  {
    id: "card-minimal",
    kind: "card",
    title: "The smallest card",
    source: `import card from "card"

let u = card.user
card.size(420, 110)
card.background("#0d1117", 10)
card.border("#30363d", 1)

card.fill("#e6edf3")
card.font(18, .Bold, false)
card.text(24, 46, u.name)

card.fill("#8b949e")
card.font(12, .Regular, false)
card.text(24, 70, "@\${u.login}, \${u.followers} followers")
`,
  },
  {
    id: "card-pen",
    kind: "card",
    title: "Pen state and shapes",
    source: `import card from "card"

card.size(420, 150)
card.background("#0d1117", 10)

card.fill("#58a6ff")
card.rect(20, 20, 120, 40, 8)

card.fill("#3fb950")
card.opacity(60)
card.circle(190, 40, 22)
card.opacity(100)

card.stroke("#f0883e", 2)
card.line(240, 20, 400, 60)
card.stroke("none", 0)

card.fill("#e6edf3")
card.icon(.Star, 20, 80, 16)
card.font(13, .Medium, false)
card.align(.Start)
card.text(44, 93, "start-aligned")
card.align(.End)
card.text(400, 93, "end-aligned")
card.align(.Middle)
card.font(12, .Regular, true)
card.text(210, 128, "centred, mono")
`,
  },
  {
    id: "card-gradient",
    kind: "card",
    title: "Gradients",
    source: `import card from "card"

card.size(420, 120)
card.gradient("sky", "#1b0338", "#07061f", 90)
card.gradient("neon", "#ff2bd6", "#00e5ff", 0)
card.background("@sky", 14)
card.border("@neon", 2)

card.fill("@neon")
card.rect(24, 80, 372, 6, 3)

card.fill("#ffffff")
card.font(20, .Bold, false)
card.text(24, 52, card.user.name)
`,
  },
  {
    id: "card-charts",
    kind: "card",
    title: "Charts",
    source: `import card from "card"

let u = card.user
card.size(420, 230)
card.background("#0d1117", 10)

card.fill("#e6edf3")
card.font(12, .Medium, false)
card.text(20, 28, "Languages")
card.languages(20, 38, 380, 8)

card.fill("#39d353")
card.heatmap(20, 66, 5, 2, 53)

card.stroke("#58a6ff", 2)
card.sparkline(20, 150, 380, 50, u.days)
`,
  },
  {
    id: "card-motion",
    kind: "card",
    title: "Motion",
    source: `import card from "card"

card.size(420, 100)
card.background("#0d1117", 10)
card.animate(.Rise)

card.fill("#e6edf3")
card.font(18, .Bold, false)
card.text(24, 42, card.user.name)
card.fill("#8b949e")
card.font(12, .Regular, false)
card.text(24, 68, "each element rises in turn")
`,
  },
  {
    id: "card-helpers",
    kind: "card",
    title: "Helpers",
    source: `import card from "card"

let u = card.user
card.size(420, 130)
card.background("#0d1117", 10)
card.fill("#e6edf3")
card.font(13, .Regular, true)
card.text(20, 32, "stars     \${card.compact(u.stars)}")
card.text(20, 56, "bio       \${card.clip(u.bio, 24)}")
card.text(20, 80, "top lang  \${card.percent(u.languages[0].share)}")
card.text(20, 104, "best day  \${card.peak(u.days)}")
`,
  },
  {
    id: "card-params",
    kind: "card",
    title: "Parameters",
    params: { theme: "light" },
    source: `import card from "card"

// ?theme=light and ?accent=#d29922 change this card.
let light = card.param("theme", "dark") == "light"
let accent = card.param("accent", "#58a6ff")
let bg = if light { "#ffffff" } else { "#0d1117" }
let ink = if light { "#1f2328" } else { "#e6edf3" }

card.size(420, 90)
card.background(bg, 10)
card.fill(accent)
card.rect(0, 0, 6, 90, 0)
card.fill(ink)
card.font(18, .Bold, false)
card.text(24, 50, card.user.name)
`,
  },
  {
    id: "card-repos",
    kind: "card",
    title: "Looping over data",
    source: `import card from "card"

let u = card.user
let rows = u.top.len()
card.size(420, 50 + 28 * rows)
card.background("#0d1117", 10)
card.fill("#e6edf3")
card.font(14, .Bold, false)
card.text(20, 30, "Top repositories")

card.font(12, .Regular, false)
for i in 0..rows {
    let r = u.top[i]
    let y = 58 + 28 * i
    card.fill("#e6edf3")
    card.align(.Start)
    card.text(20, y, r.name)
    card.fill("#8b949e")
    card.align(.End)
    card.text(400, y, "\${card.compact(r.stars)} stars")
}
`,
  },
];

export const DIAGNOSTICS: Diagnostic[] = [
  {
    id: "diag-compile",
    title: "A compile error",
    outcome: "compile",
    source: `import site from "site"

let count = site.projects.len()
site.print(count)
`,
    report: `error[E0301]: type mismatch: expected \`string\`, found \`i64\`
  --> script.eit:4:12
  |
4 | site.print(count)
  |            ^^^^^`,
  },
  {
    id: "diag-fault",
    title: "A runtime fault",
    outcome: "fault",
    source: `import site from "site"

var n: i64 = 9223372036854775807
n = n + 1
site.print("\${n}")
`,
    report: `fault: integer overflow
  --> script.eit:4:5
  |
4 | n = n + 1
  |     ^^^^^ in \`<module>\``,
  },
  {
    id: "diag-missing-field",
    title: "A missing struct field",
    outcome: "compile",
    source: `import site from "site"

site.action(site.Action {
    name: "hello",
    title: "Say hello",
    run: () => site.print("hello"),
})
`,
    report: `error[E0301]: missing struct field
  --> script.eit:3:13
  |
3 |   site.action(site.Action {
  | /-------------^
4 | |     name: "hello",
5 | |     title: "Say hello",
6 | |     run: () => site.print("hello"),
7 | | })
  | \\-^`,
  },
  {
    id: "diag-match",
    title: "A match that misses cases",
    outcome: "compile",
    source: `import site from "site"
import theme from "site/theme"

fn mood(w: theme.Weather) -> string {
    return match w {
        .Rain => "wet"
        .Clear => "dry"
    }
}

site.print(mood(.Rain))
`,
    report: `error[E0301]: non-exhaustive match
  --> script.eit:5:12
  |
5 |       return match w {
  | /------------^
6 | |         .Rain => "wet"
7 | |         .Clear => "dry"
8 | |     }
  | \\-----^`,
  },
  {
    id: "diag-card",
    title: "A card script with a mistake",
    kind: "card",
    outcome: "compile",
    source: `import card from "card"

card.size(420, 120)
card.text(24, 40, 42)
`,
    report: `error[E0301]: type mismatch: expected \`string\`, found \`i64\`
  --> script.eit:4:19
  |
4 | card.text(24, 40, 42)
  |                   ^^`,
  },
];

const byId = new Map(SAMPLES.map((s) => [s.id, s]));
const diagById = new Map(DIAGNOSTICS.map((d) => [d.id, d]));

export function sample(id: string): Sample {
  const found = byId.get(id);
  if (!found) throw new Error(`docs: no sample "${id}"`);
  return found;
}

export function diagnostic(id: string): Diagnostic {
  const found = diagById.get(id);
  if (!found) throw new Error(`docs: no diagnostic "${id}"`);
  return found;
}
