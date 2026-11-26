// Built-in card scripts, selectable with ?preset=<id>. Each is copied verbatim
// from the eitri repo's crates/eitri-wasm/examples/card/, where
// js/smoke.test.mjs renders it against the real wasm and checks its effects.

export interface Preset {
  id: string;
  title: string;
  description: string;
  source: string;
}

export const DEFAULT_PRESET = "classic";

export const PRESETS: Preset[] = [
  {
    id: "classic",
    title: "Classic stats",
    description: "Avatar, headline numbers and a language bar. ?theme=dark|light, ?accent",
    source:
      'import card from "card"\n\n// The classic profile card. ?theme=light|dark, ?accent=#58a6ff\nlet u = card.user\nlet light = card.param("theme", "dark") == "light"\nlet bg = if light { "#ffffff" } else { "#0d1117" }\nlet edge = if light { "#d0d7de" } else { "#30363d" }\nlet ink = if light { "#1f2328" } else { "#e6edf3" }\nlet dim = if light { "#656d76" } else { "#8b949e" }\nlet accent = card.param("accent", "#58a6ff")\n\nfn stat(kind: card.Icon, x: i64, y: i64, label: string, value: i64) {\n    card.fill(accent)\n    card.icon(kind, x, y - 12, 14)\n    card.fill(dim)\n    card.font(12, .Regular, false)\n    card.align(.Start)\n    card.text(x + 22, y, label)\n    card.fill(ink)\n    card.font(12, .Bold, false)\n    card.align(.End)\n    card.text(x + 205, y, card.compact(value))\n}\n\ncard.size(495, 195)\ncard.background(bg, 10)\ncard.border(edge, 1)\n\ncard.avatar(22, 18, 46, true)\ncard.fill(ink)\ncard.font(17, .Bold, false)\ncard.align(.Start)\ncard.text(80, 38, card.clip(u.name, 28))\ncard.fill(dim)\ncard.font(12, .Regular, false)\ncard.text(80, 56, "@${u.login}  -  since ${u.joined}")\n\nstat(.Star, 24, 92, "Stars", u.stars)\nstat(.Commit, 24, 114, "Commits this year", u.commits)\nstat(.PullRequest, 24, 136, "Pull requests", u.pull_requests)\nstat(.Issue, 258, 92, "Issues", u.issues)\nstat(.Repo, 258, 114, "Contributed to", u.contributed_to)\nstat(.People, 258, 136, "Followers", u.followers)\n\ncard.languages(24, 154, 447, 7)\nvar legend = ""\nfor i in 0..u.languages.len() {\n    if i < 4 {\n        let l = u.languages[i]\n        if i > 0 {\n            legend = legend + "  |  "\n        }\n        legend = legend + "${l.name} ${card.percent(l.share)}"\n    }\n}\ncard.fill(dim)\ncard.font(10, .Regular, false)\ncard.align(.Start)\ncard.text(24, 180, legend)\n',
  },
  {
    id: "languages",
    title: "Language ranks",
    description: "Ranked bars for the languages you write most. ?theme, ?accent",
    source:
      'import card from "card"\n\n// Ranked language bars. ?theme=light|dark\nlet u = card.user\nlet light = card.param("theme", "dark") == "light"\nlet bg = if light { "#ffffff" } else { "#0d1117" }\nlet edge = if light { "#d0d7de" } else { "#30363d" }\nlet ink = if light { "#1f2328" } else { "#e6edf3" }\nlet dim = if light { "#656d76" } else { "#8b949e" }\nlet track = if light { "#eaeef2" } else { "#21262d" }\n\nlet n = u.languages.len()\nlet rows = if n < 1 { 1 } else { n }\nlet width = 420\ncard.size(width, 66 + 26 * rows)\ncard.background(bg, 10)\ncard.border(edge, 1)\n\ncard.fill(ink)\ncard.icon(.Code, 22, 20, 16)\ncard.font(15, .Bold, false)\ncard.align(.Start)\ncard.text(46, 33, "Top languages")\ncard.fill(dim)\ncard.font(11, .Regular, false)\ncard.align(.End)\ncard.text(width - 22, 33, "@${u.login}")\n\nfor i in 0..n {\n    let l = u.languages[i]\n    let y = 52 + 26 * i\n    card.fill(ink)\n    card.font(12, .Medium, false)\n    card.align(.Start)\n    card.text(22, y + 12, l.name)\n    card.fill(dim)\n    card.font(11, .Regular, false)\n    card.align(.End)\n    card.text(width - 22, y + 12, card.percent(l.share))\n    card.fill(track)\n    card.rect(22, y + 18, width - 44, 5, 3)\n    var w = i64(l.share * f64(width - 44))\n    if w < 4 {\n        w = 4\n    }\n    card.fill(l.color)\n    card.rect(22, y + 18, w, 5, 3)\n}\n',
  },
  {
    id: "heatmap",
    title: "Contribution heatmap",
    description: "The last year of contributions, with current and longest streaks. ?accent",
    source:
      'import card from "card"\n\n// A year of contributions. ?theme=light|dark, ?accent=#39d353\nlet u = card.user\nlet light = card.param("theme", "dark") == "light"\nlet bg = if light { "#ffffff" } else { "#0d1117" }\nlet edge = if light { "#d0d7de" } else { "#30363d" }\nlet ink = if light { "#1f2328" } else { "#e6edf3" }\nlet dim = if light { "#656d76" } else { "#8b949e" }\nlet accent = card.param("accent", "#39d353")\n\n// Current streak (counting back from the newest day) and the longest one.\nvar current = 0\nvar longest = 0\nvar run = 0\nfor d in u.days {\n    if d > 0 {\n        run += 1\n    } else {\n        run = 0\n    }\n    if run > longest {\n        longest = run\n    }\n    current = run\n}\n\ncard.size(730, 200)\ncard.background(bg, 10)\ncard.border(edge, 1)\n\ncard.fill(accent)\ncard.icon(.Flame, 24, 20, 18)\ncard.fill(ink)\ncard.font(16, .Bold, false)\ncard.align(.Start)\ncard.text(50, 35, "${card.compact(u.contributions)} contributions in the last year")\ncard.fill(dim)\ncard.font(11, .Regular, false)\ncard.align(.End)\ncard.text(706, 35, "@${u.login}")\n\ncard.fill(accent)\ncard.heatmap(24, 58, 10, 3, 53)\n\ncard.font(11, .Regular, false)\ncard.align(.Start)\ncard.fill(dim)\ncard.text(24, 175, "Streak")\ncard.fill(ink)\ncard.font(11, .Bold, false)\ncard.text(66, 175, "${current} days")\ncard.fill(dim)\ncard.font(11, .Regular, false)\ncard.text(160, 175, "Longest")\ncard.fill(ink)\ncard.font(11, .Bold, false)\ncard.text(212, 175, "${longest} days")\ncard.fill(dim)\ncard.font(11, .Regular, false)\ncard.text(306, 175, "Best day")\ncard.fill(ink)\ncard.font(11, .Bold, false)\ncard.text(358, 175, "${card.peak(u.days)}")\n',
  },
  {
    id: "badge",
    title: "Status badge",
    description: "A one-line badge for the top of a README. ?theme, ?accent",
    source:
      'import card from "card"\n\n// A one-line badge. ?theme=light|dark, ?accent=#2ea043\nlet u = card.user\nlet light = card.param("theme", "dark") == "light"\nlet bg = if light { "#ffffff" } else { "#161b22" }\nlet edge = if light { "#d0d7de" } else { "#30363d" }\nlet ink = if light { "#1f2328" } else { "#e6edf3" }\nlet dim = if light { "#656d76" } else { "#8b949e" }\nlet accent = card.param("accent", "#2ea043")\n\nlet width = 322\nlet mid = 18\n\ncard.size(width, 36)\ncard.background(bg, 18)\ncard.border(edge, 1)\n\n// The avatar in an accent ring, inset from the pill\'s edge.\ncard.fill(accent)\ncard.circle(mid, mid, 14)\ncard.avatar(6, 6, 24, true)\n\n// Stat widths are estimated (about 7 px per character at 12 px), so the\n// stats are laid out from the right edge and the gaps stay even whatever the\n// numbers are. Positions first, then drawing in reading order.\nfn width_of(value: string) -> i64 {\n    return 19 + value.len() * 7\n}\n\nfn chip(kind: card.Icon, left: i64, value: string) {\n    card.fill(accent)\n    card.icon(kind, left, mid - 7, 14)\n    card.fill(dim)\n    card.font(12, .Medium, false)\n    card.align(.Start)\n    card.text(left + 19, mid + 4, value)\n}\n\nlet stars = card.compact(u.stars)\nlet commits = card.compact(u.commits)\nlet followers = card.compact(u.followers)\nlet gap = 14\nlet people_at = width - 16 - width_of(followers)\nlet commit_at = people_at - gap - width_of(commits)\nlet star_at = commit_at - gap - width_of(stars)\n\n// The login takes the room that is left, about 8 px per character at 13 px.\nlet start = 42\ncard.fill(ink)\ncard.font(13, .Bold, false)\ncard.align(.Start)\ncard.text(start, mid + 5, card.clip(u.login, (star_at - 10 - start) / 8))\n\nchip(.Star, star_at, stars)\nchip(.Commit, commit_at, commits)\nchip(.People, people_at, followers)\n',
  },
  {
    id: "terminal",
    title: "Terminal",
    description: "whoami as a shell session, with a scan line. ?theme, ?accent",
    source:
      'import card from "card"\n\n// A shell session about you. ?accent=#3fb950\nlet u = card.user\nlet accent = card.param("accent", "#3fb950")\nlet ink = "#c9d1d9"\nlet dim = "#6e7681"\n\ncard.size(560, 250)\ncard.background("#0b0f14", 10)\ncard.border("#2b333d", 1)\ncard.animate(.Scan)\n\n// Title bar.\ncard.fill("#161b22")\ncard.rect(0, 0, 560, 30, 10)\ncard.rect(0, 20, 560, 10, 0)\ncard.fill("#ff5f56")\ncard.circle(18, 15, 5)\ncard.fill("#ffbd2e")\ncard.circle(36, 15, 5)\ncard.fill("#27c93f")\ncard.circle(54, 15, 5)\ncard.fill(dim)\ncard.font(11, .Regular, true)\ncard.align(.Middle)\ncard.text(280, 19, "${u.login}@github: ~")\n\ncard.align(.Start)\ncard.font(13, .Regular, true)\nvar y = 56\nfn prompt(command: string) {\n    card.fill(accent)\n    card.text(18, y, "$")\n    card.fill(ink)\n    card.text(34, y, command)\n    y += 20\n}\nfn out(line: string) {\n    card.fill(dim)\n    card.text(34, y, line)\n    y += 20\n}\n\nprompt("whoami")\nout("${card.clip(u.name, 40)} (${u.login})")\nprompt("echo $BIO")\nout(if u.bio == "" { "(nothing yet)" } else { card.clip(u.bio, 56) })\nprompt("git log --since=1.year | wc -l")\nout("${card.compact(u.contributions)} contributions, ${u.commits} commits this year")\nprompt("curl -s github/stars | jq .total")\nout("${card.compact(u.stars)} stars over ${u.repos} repos, ${u.followers} followers")\ncard.fill(accent)\ncard.text(18, y, "$")\ncard.fill(ink)\ncard.rect(34, y - 11, 8, 14, 0)\n',
  },
  {
    id: "synthwave",
    title: "Synthwave neon",
    description: "Neon gradient, pulsing. ?hot, ?cool",
    source:
      'import card from "card"\n\n// Neon on dusk. ?hot=#ff2bd6, ?cool=#00e5ff\nlet u = card.user\nlet hot = card.param("hot", "#ff2bd6")\nlet cool = card.param("cool", "#00e5ff")\n\ncard.size(560, 230)\ncard.gradient("sky", "#1b0338", "#07061f", 90)\ncard.gradient("neon", hot, cool, 0)\ncard.background("@sky", 14)\ncard.border("@neon", 2)\ncard.animate(.Pulse)\n\n// A sun and a perspective floor.\ncard.fill("@neon")\ncard.opacity(25)\ncard.circle(470, 150, 54)\ncard.opacity(100)\ncard.stroke(hot, 1)\ncard.opacity(35)\nfor i in 0..8 {\n    card.line(0, 170 + i * i, 560, 170 + i * i)\n}\nfor i in 0..11 {\n    card.line(280, 150, i * 56, 230)\n}\ncard.opacity(100)\ncard.stroke("none", 0)\n\ncard.fill("@neon")\ncard.font(30, .Bold, false)\ncard.align(.Start)\ncard.text(28, 56, card.clip(u.name, 20))\ncard.fill(cool)\ncard.font(12, .Medium, true)\ncard.text(28, 78, "@${u.login}")\n\nfn neon(kind: card.Icon, x: i64, label: string, value: i64) {\n    card.fill(hot)\n    card.icon(kind, x, 98, 16)\n    card.fill("#ffffff")\n    card.font(20, .Bold, false)\n    card.text(x, 140, card.compact(value))\n    card.fill(cool)\n    card.font(10, .Medium, true)\n    card.text(x, 156, label)\n}\nneon(.Star, 28, "STARS", u.stars)\nneon(.Commit, 118, "COMMITS", u.commits)\nneon(.PullRequest, 208, "PRS", u.pull_requests)\nneon(.People, 298, "FOLLOWERS", u.followers)\n\n// The last 60 days as a glowing line.\nvar recent: []i64 = []\nlet from = if u.days.len() > 60 { u.days.len() - 60 } else { 0 }\nfor i in from..u.days.len() {\n    recent.push(u.days[i])\n}\ncard.stroke(cool, 2)\ncard.sparkline(28, 180, 300, 32, recent)\n',
  },
  {
    id: "repos",
    title: "Top repos",
    description: "Your most-starred repositories with their languages. ?theme, ?accent",
    source:
      'import card from "card"\n\n// Your most starred repositories. ?theme=light|dark\nlet u = card.user\nlet light = card.param("theme", "dark") == "light"\nlet bg = if light { "#ffffff" } else { "#0d1117" }\nlet edge = if light { "#d0d7de" } else { "#30363d" }\nlet ink = if light { "#1f2328" } else { "#e6edf3" }\nlet dim = if light { "#656d76" } else { "#8b949e" }\nlet accent = card.param("accent", "#58a6ff")\n\nfn colour_of(name: string) -> string {\n    for l in u.languages {\n        if l.name == name {\n            return l.color\n        }\n    }\n    return dim\n}\n\nlet n = u.top.len()\nlet rows = if n < 1 { 1 } else { n }\ncard.size(495, 62 + 46 * rows)\ncard.background(bg, 10)\ncard.border(edge, 1)\n\ncard.fill(ink)\ncard.icon(.Repo, 22, 20, 16)\ncard.font(15, .Bold, false)\ncard.align(.Start)\ncard.text(46, 33, "Top repositories")\n\nfor i in 0..n {\n    let r = u.top[i]\n    let y = 54 + 46 * i\n    card.stroke(edge, 1)\n    card.line(22, y, 473, y)\n    card.stroke("none", 0)\n    card.fill(accent)\n    card.font(13, .Bold, false)\n    card.align(.Start)\n    card.text(22, y + 19, card.clip(r.name, 30))\n    card.fill(dim)\n    card.font(11, .Regular, false)\n    card.text(22, y + 36, if r.description == "" { "No description" } else { card.clip(r.description, 62) })\n    card.fill(colour_of(r.language))\n    card.circle(290, y + 15, 4)\n    card.fill(dim)\n    card.text(299, y + 19, if r.language == "" { "-" } else { r.language })\n    card.icon(.Star, 418, y + 8, 12)\n    card.align(.End)\n    card.text(473, y + 19, "${card.compact(r.stars)}")\n}\n',
  },
  {
    id: "minimal",
    title: "Minimal profile",
    description: "Name, bio, location and a few numbers. ?theme, ?accent",
    source:
      'import card from "card"\n\n// A quiet profile card. ?theme=light|dark\nlet u = card.user\nlet light = card.param("theme", "light") == "light"\nlet bg = if light { "#fafaf9" } else { "#0c0a09" }\nlet edge = if light { "#e7e5e4" } else { "#292524" }\nlet ink = if light { "#1c1917" } else { "#fafaf9" }\nlet dim = if light { "#78716c" } else { "#a8a29e" }\n\ncard.size(420, 170)\ncard.background(bg, 14)\ncard.border(edge, 1)\n\ncard.avatar(26, 26, 64, true)\n\ncard.fill(ink)\ncard.font(20, .Bold, false)\ncard.align(.Start)\ncard.text(108, 52, card.clip(u.name, 22))\ncard.fill(dim)\ncard.font(12, .Regular, false)\ncard.text(108, 72, "@${u.login}")\nif u.location != "" {\n    card.icon(.Location, 108, 82, 12)\n    card.text(124, 92, card.clip(u.location, 30))\n}\n\ncard.fill(ink)\ncard.font(13, .Regular, false)\ncard.text(26, 128, if u.bio == "" { "Writes code in public." } else { card.clip(u.bio, 52) })\n\ncard.fill(dim)\ncard.font(11, .Medium, false)\ncard.text(26, 150, "${card.compact(u.followers)} followers  |  ${card.compact(u.stars)} stars  |  ${u.repos} repos")\n',
  },
];

export const presetById = (id: string): Preset | undefined => PRESETS.find((p) => p.id === id);
