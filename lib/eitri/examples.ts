// Example scripts for the console, grouped in the Examples menu.
//
// Every example is copied verbatim from the eitri repo's
// crates/eitri-wasm/examples/*.eit, where js/smoke.test.mjs runs it against the
// real wasm and asserts its effects, so they are known to compile and run.

export interface Example {
  id: string;
  group: string;
  title: string;
  source: string;
}

/** What the editor shows before a visitor has written anything. */
export const DEFAULT_SCRIPT = `import site from "site"
import theme from "site/theme"
import ui from "site/ui"
import keys from "site/keys"

// This page runs Eitri. Change something and press Cmd+Enter.
theme.hue(195)
theme.weather(.Clear)

// Actions show up in the command palette (Cmd+K) and can be bound to keys.
site.action(site.Action {
    name: "hello",
    title: "Say hello",
    description: "A toast from your script",
    category: "Starter",
    keywords: ["greet"],
    run: () => {
        ui.toast("hello from \${site.projects.len()} projects", .Ok)
    },
})
keys.bind("shift+h", "hello")

site.print("Cmd+K for the palette, Shift+H to say hello")
`;

export const EXAMPLES: Example[] = [
  {
    id: "terminal-mode",
    group: "Look",
    title: "Terminal mode",
    source:
      'import site from "site"\nimport theme from "site/theme"\nimport ui from "site/ui"\n\n// Terminal mode: the whole page in the mono face, green phosphor on curved\n// glass, and code raining down the background.\ntheme.mono(true)\ntheme.crt(true)\ntheme.scanlines(true)\ntheme.flicker(true)\ntheme.weather(.Matrix)\ntheme.hue(135)\ntheme.glow(70)\ntheme.grid(24)\ntheme.cursor(.Crosshair)\nsite.title("root@junaadh")\nui.toast("terminal mode on", .Ok)\n',
  },
  {
    id: "night-shift",
    group: "Look",
    title: "Night shift",
    source:
      'import site from "site"\nimport theme from "site/theme"\nimport time from "site/time"\n\n// Between 8pm and 6am (Maldives time) the page goes violet and stormy. The\n// script checks again every minute, so it also flips while the tab stays open.\nfn night(hour: i64) -> bool {\n    return hour >= 20 || hour < 6\n}\n\nfn apply() {\n    let t = site.time\n    if night(t.hour) {\n        theme.hue(270)\n        theme.weather(.Storm)\n        theme.glow(80)\n        theme.scanlines(true)\n    } else {\n        theme.hue(190)\n        theme.weather(.Clear)\n        theme.glow(40)\n        theme.scanlines(false)\n    }\n    site.readout("SHIFT", if night(t.hour) { "night" } else { "day" })\n}\n\napply()\ntime.every(60000, () => apply())\n',
  },
  {
    id: "newest-first",
    group: "Content",
    title: "Newest first",
    source:
      'import site from "site"\n\n// Sort the projects by year, newest first (an insertion sort), then hand the\n// order to the page.\nvar sorted: []string = []\nvar years: []i64 = []\nfor p in site.projects {\n    var at = sorted.len()\n    while at > 0 && years[at - 1] < p.year {\n        at -= 1\n    }\n    sorted.insert(at, p.slug)\n    years.insert(at, p.year)\n}\nsite.order(sorted)\nsite.readout("NEWEST", sorted[0])\n',
  },
  {
    id: "rust-spotlight",
    group: "Content",
    title: "Rust spotlight",
    source:
      'import site from "site"\n\n// Highlight every project with Rust in its stack and tag it with a badge.\nvar found = 0\nfor p in site.projects {\n    var rusty = false\n    for item in p.stack {\n        if item == "Rust" {\n            rusty = true\n        }\n    }\n    if rusty {\n        site.highlight(p.slug)\n        site.badge(p.slug, "RUST")\n        found += 1\n    }\n}\nsite.readout("RUST", "${found} projects")\n',
  },
  {
    id: "welcome-back",
    group: "Content",
    title: "Welcome back",
    source:
      'import site from "site"\nimport fx from "site/fx"\nimport ui from "site/ui"\n\n// site.visits counts the page loads that replayed a saved script, this one\n// included, so the first visit and the later ones can be told apart.\nif site.visits <= 1 {\n    fx.typeout("hello, first time here?")\n} else {\n    fx.typeout("welcome back, visit #${site.visits}")\n    ui.toast("good to see you again", .Info)\n}\n',
  },
  {
    id: "theme-picker",
    group: "Actions & prompts",
    title: "Theme picker",
    source:
      'import site from "site"\nimport theme from "site/theme"\nimport keys from "site/keys"\nimport ui from "site/ui"\n\n// A command in the palette, bound to the "t" key. It opens a picker; the\n// answer arrives in a callback that changes the accent colour.\nfn hue_of(name: string) -> i64 {\n    return match name {\n        "red" => 355\n        "amber" => 40\n        "green" => 140\n        "cyan" => 190\n        _ => 270\n    }\n}\n\nsite.action(site.Action {\n    name: "theme_picker",\n    title: "Pick an accent colour",\n    description: "Choose the accent colour of the page",\n    category: "Look",\n    keywords: ["theme", "hue", "colour", "color"],\n    run: () => {\n        ui.pick(ui.Pick {\n            title: "Accent colour",\n            placeholder: "red, amber, green, cyan or violet",\n            items: [\n                ui.Item { id: "red", title: "Red", subtitle: "hue 355", detail: "warning light" },\n                ui.Item { id: "amber", title: "Amber", subtitle: "hue 40", detail: "old terminal" },\n                ui.Item { id: "green", title: "Green", subtitle: "hue 140", detail: "phosphor" },\n                ui.Item { id: "cyan", title: "Cyan", subtitle: "hue 190", detail: "the default" },\n                ui.Item { id: "violet", title: "Violet", subtitle: "hue 270", detail: "after dark" },\n            ],\n        }, choice => {\n            if let name = choice {\n                theme.hue(hue_of(name))\n                ui.toast("accent: ${name}", .Ok)\n            }\n        })\n    },\n})\n\nkeys.bind("t", "theme_picker")\n',
  },
  {
    id: "ask-my-name",
    group: "Actions & prompts",
    title: "Ask my name",
    source:
      'import site from "site"\nimport keys from "site/keys"\nimport ui from "site/ui"\n\n// A palette command that asks for a name and writes it into the hero. A\n// dismissed prompt answers null and changes nothing.\nsite.action(site.Action {\n    name: "ask_name",\n    title: "Set the hero name",\n    description: "Ask for a name and use it as the title",\n    category: "Content",\n    keywords: ["name", "title", "hero"],\n    run: () => {\n        ui.input(ui.Input {\n            title: "What should the page call you?",\n            placeholder: "your name",\n            value: "",\n            confirm: "Rename",\n        }, answer => {\n            if let name = answer {\n                site.title(name)\n                ui.toast("hello, ${name}", .Ok)\n            }\n        })\n    },\n})\n\nkeys.bind("shift+n", "ask_name")\n',
  },
  {
    id: "panic-button",
    group: "Actions & prompts",
    title: "Panic button",
    source:
      'import site from "site"\nimport theme from "site/theme"\nimport ui from "site/ui"\n\n// site.stop drops every action, handler, key binding and timer this script\n// registered. The look set at the top level stays; the behaviour is gone.\ntheme.invert(true)\ntheme.weather(.Snow)\n\nsite.on("idle", e => {\n    ui.banner("still here")\n})\n\nsite.action(site.Action {\n    name: "panic",\n    title: "Stop all scripts",\n    description: "Drop every handler, action and timer",\n    category: "Script",\n    keywords: ["stop", "kill"],\n    run: () => {\n        site.stop()\n        ui.toast("script stopped", .Warn)\n    },\n})\n',
  },
  {
    id: "vim-navigation",
    group: "Keys",
    title: "Vim navigation",
    source:
      'import site from "site"\nimport keys from "site/keys"\nimport ui from "site/ui"\n\n// A "nav" mode. Press "n" to enter it, then g>w, g>l, g>c and g>t jump to a\n// section and j and k step through them. Escape leaves the mode.\nlet sections = ["top", "work", "log", "systems", "contact"]\nvar at = 0\n\nfn go(section: string) {\n    var i = 0\n    for name in sections {\n        if name == section {\n            at = i\n        }\n        i += 1\n    }\n    site.goto(section)\n}\n\nfn action(name: string, title: string, run: fn() -> void) {\n    site.action(site.Action {\n        name: name,\n        title: title,\n        description: "",\n        category: "Navigate",\n        keywords: ["vim", "nav"],\n        run: run,\n    })\n}\n\naction("nav_on", "Vim navigation", () => {\n    keys.enter("nav")\n    ui.toast("nav mode: g w, g l, g c, g t, j, k. Esc leaves.", .Info)\n})\naction("nav_work", "Go to work", () => go("work"))\naction("nav_log", "Go to log", () => go("log"))\naction("nav_contact", "Go to contact", () => go("contact"))\naction("nav_top", "Go to top", () => go("top"))\naction("nav_down", "Next section", () => {\n    if at < sections.len() - 1 {\n        go(sections[at + 1])\n    }\n})\naction("nav_up", "Previous section", () => {\n    if at > 0 {\n        go(sections[at - 1])\n    }\n})\n\nkeys.mode("nav", true)\nkeys.bind("n", "nav_on")\nkeys.bind("nav/g>w", "nav_work")\nkeys.bind("nav/g>l", "nav_log")\nkeys.bind("nav/g>c", "nav_contact")\nkeys.bind("nav/g>t", "nav_top")\nkeys.bind("nav/j", "nav_down")\nkeys.bind("nav/k", "nav_up")\n',
  },
  {
    id: "konami-code",
    group: "Events",
    title: "Konami code",
    source:
      'import site from "site"\nimport fx from "site/fx"\nimport ui from "site/ui"\nimport sound from "site/sound"\n\n// Up up down down left right left right b a. The page reports it as the\n// "konami" event; this handler answers with a glitch, a spark burst from the\n// hero, a flash and a chord.\nvar uses = 0\nsite.on("konami", e => {\n    uses += 1\n    fx.glitch(700)\n    fx.sparks("")\n    fx.flash()\n    sound.chord([262, 330, 392, 523], 500)\n    ui.toast("+30 lives (x${uses})", .Ok)\n})\n',
  },
  {
    id: "hover-sparks",
    group: "Events",
    title: "Hover sparks",
    source:
      'import site from "site"\nimport fx from "site/fx"\nimport sound from "site/sound"\n\n// Sparks fly off a project card when the pointer touches it, with a tiny\n// blip. The event carries the card\'s slug; it is null for other events.\nsite.on("project.hover", e => {\n    if let slug = e.slug {\n        fx.sparks(slug)\n        sound.beep(880, 40)\n    }\n})\n',
  },
  {
    id: "screensaver",
    group: "Events",
    title: "Screensaver",
    source:
      'import site from "site"\nimport theme from "site/theme"\nimport ui from "site/ui"\n\n// After 30 quiet seconds the page turns into an aurora with a banner. Any\n// input brings the real page back.\nsite.on("idle", e => {\n    theme.weather(.Aurora)\n    theme.glow(90)\n    ui.banner("screensaver - move the mouse to wake up")\n})\n\nsite.on("active", e => {\n    theme.weather(.Clear)\n    theme.glow(40)\n    ui.banner("")\n})\n',
  },
  {
    id: "click-counter",
    group: "Events",
    title: "Click counter",
    source:
      'import site from "site"\nimport ui from "site/ui"\n\n// A closure that counts project clicks. The counts live in the script\'s own\n// variables between events and show up as badges and a readout.\nvar slugs: []string = []\nvar counts: []i64 = []\nvar total = 0\n\nsite.on("project.click", e => {\n    guard let slug = e.slug else {\n        return\n    }\n    var at = -1\n    var i = 0\n    for known in slugs {\n        if known == slug {\n            at = i\n        }\n        i += 1\n    }\n    if at < 0 {\n        slugs.push(slug)\n        counts.push(0)\n        at = slugs.len() - 1\n    }\n    counts[at] += 1\n    total += 1\n    site.badge(slug, "${counts[at]} clicks")\n    site.readout("CLICKS", "${total}")\n})\n',
  },
  {
    id: "scroll-spy",
    group: "Events",
    title: "Scroll spy",
    source:
      'import site from "site"\n\n// The "section" event fires as each section scrolls into view.\nsite.on("section", e => {\n    if let name = e.section {\n        site.readout("SECTION", name.to_upper())\n    }\n})\n',
  },
  {
    id: "tab-watcher",
    group: "Events",
    title: "Tab watcher",
    source:
      'import site from "site"\nimport ui from "site/ui"\n\n// "hidden" and "visible" fire when the visitor leaves and returns to the tab.\nsite.on("hidden", e => {\n    ui.banner("come back soon")\n})\n\nsite.on("visible", e => {\n    ui.banner("")\n    ui.toast("welcome back", .Info)\n})\n',
  },
  {
    id: "live-clock",
    group: "Timers",
    title: "Live clock readout",
    source:
      'import site from "site"\nimport time from "site/time"\n\n// A clock row in the SYS.READOUT panel, refreshed every second. Callbacks keep\n// running after the script\'s last line, so the timer owns the readout.\nfn pad(n: i64) -> string {\n    if n < 10 {\n        return "0${n}"\n    }\n    return "${n}"\n}\n\nfn show() {\n    let t = site.time\n    site.readout("CLOCK", "${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)} MVT")\n}\n\nshow()\ntime.every(1000, () => show())\n',
  },
  {
    id: "countdown",
    group: "Timers",
    title: "Countdown",
    source:
      'import site from "site"\nimport fx from "site/fx"\nimport ui from "site/ui"\nimport time from "site/time"\nimport sound from "site/sound"\n\n// A countdown built from time.after: each step schedules the next one from\n// inside its own callback. The "relaunch" action starts it again.\nfn step(n: i64) {\n    if n == 0 {\n        ui.banner("")\n        fx.flash()\n        fx.shake(6)\n        sound.chord([392, 523, 659], 600)\n        ui.toast("liftoff", .Ok)\n        return\n    }\n    ui.banner("T-minus ${n}")\n    sound.beep(440, 80)\n    time.after(1000, () => step(n - 1))\n}\n\nsite.action(site.Action {\n    name: "relaunch",\n    title: "Relaunch countdown",\n    description: "Count down from 3 again",\n    category: "Fun",\n    keywords: ["countdown", "timer"],\n    run: () => step(3),\n})\n\nstep(3)\n',
  },
];
