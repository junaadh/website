// What the SDK declaration files leave out: descriptions for the functions that
// have no comment, and the limits each module's host code enforces (all from
// lib/eitri/model.ts, lib/eitri/engine.ts and lib/card/render.ts). The pages
// show the file's own comment when there is one and this text only as a
// fallback; scripts/check-docs.mjs fails if a public function has neither.
// No imports: node loads this file directly.

/** "module#function" -> description. */
export const FN_NOTES: Record<string, string> = {
  "site#action":
    "Registers a command. It appears in the command palette and can be bound to a key; the callback runs each time it is invoked.",
  "site#hide": "Hides a project card. An unknown slug is ignored.",
  "site#highlight": "Lights up a project card with a frame. An unknown slug is ignored.",
  "site/theme#weather": "The backdrop weather.",
  "site/theme#scanlines": "Horizontal scanlines over the backdrop.",
  "site/theme#invert":
    "Inverts the page colours. The console, palette and toasts are not inverted.",
  "site/theme#cursor": "The pointer style.",
  "site/ui#toast": "A short message in the corner of the screen, up to 160 characters.",
  "site/ui#input":
    "Asks the visitor for a line of text in the palette. The callback receives the text, or null if it was dismissed.",
  "site/keys#bind":
    "Binds a key, a sequence or a mode key to an action name. A binding to a name that does not exist toasts a warning when pressed.",
  "site/keys#unbind": "Removes a binding. The key is written the same way it was bound.",
  "site/keys#enter": "Makes a mode the active one. Its bindings now apply; Escape leaves it.",
  "site/keys#exit": "Leaves the active mode.",
  "site/time#cancel": "Stops a timer, using the id that after or every returned.",
  "site/sound#mute":
    "Mutes or unmutes the sounds this script makes. The visitor's own mute (the Toggle sound action) is separate and always wins.",
  "card#background":
    'Fills the card with a colour or a gradient ("@name"). The radius rounds the corners, up to half the card.',
  "card#border":
    "Draws a frame just inside the card edge. The colour must be a plain colour, not a gradient; the width is 0-20.",
  "card#gradient":
    'Defines a linear gradient called name, to use as "@name" in fill and background. The angle is in degrees: 0 points up, 90 points right.',
  "card#fill":
    'Sets the fill colour (a colour or "@name") for the shapes, text, icons and charts drawn after it.',
  "card#font": "Sets the text size (6-96), the weight and whether to use the monospace face.",
  "card#align": "Sets how text sits around its x position.",
  "card#rect":
    "A rectangle with its top left corner at x, y. It is filled with the fill colour and outlined by the stroke, if one is set.",
  "card#circle": "A circle with its centre at x, y.",
  "card#line":
    "A line between two points. It is drawn with the stroke; if no stroke is set it is a 1 px line in the fill colour.",
  "card#text":
    "Draws text with its baseline at y. Line breaks become spaces and the text is cut to 300 characters.",
  "card#icon":
    "Draws one of the built-in outline icons with its top left corner at x, y, scaled to size (4-256), in the fill colour.",
  "card#avatar":
    "Draws the user's avatar with its top left corner at x, y (size 8-512, round for a circle). A grey placeholder is drawn if there is no avatar. At most two per card.",
};

/** "module#value" -> description, for the `pub let` values that have no comment. */
export const VALUE_NOTES: Record<string, string> = {
  "site#projects": "Every project on this site, in the order of the portfolio data.",
  "site#time": "The time in the Maldives (UTC+5) when the script or callback started.",
  "card#user": "The GitHub profile the card is drawn for.",
};

export interface ModuleInfo {
  /** One line for the index page. */
  summary: string;
  /** Limits the host enforces on this module's calls. */
  limits: string[];
  /** Ids from lib/docs/samples.ts, shown as examples. */
  samples: string[];
}

export const MODULE_INFO: Record<string, ModuleInfo> = {
  site: {
    summary: "The page, its content and the actions, events and data scripts plug into.",
    limits: [
      "Script action names are lowercase letters, digits and underscores, up to 32 characters. At most 64 actions; titles are cut to 48 characters, descriptions to 120, categories to 24, and each action keeps up to 8 keywords of 24 characters.",
      "At most 16 handlers per event. The events are project.hover, project.leave, project.click, section, key, idle, active, visible, hidden and konami. Noisy events are rate limited: project.hover to 10 a second per project, the others to 20 a second.",
      "The hero title is cut to 24 characters. The readout panel has 8 rows (labels 16 characters, values 40); a row with the same label, ignoring case, is replaced. A project card carries up to 3 badges of 12 characters.",
      "Slugs that do not match a project are ignored by order, hide, highlight, badge and open.",
      "The console keeps the last 500 lines of output.",
    ],
    samples: ["site-content", "site-actions", "site-events", "site-navigate", "site-stop"],
  },
  "site/theme": {
    summary: "The look: accent colour, weather, grid, glow and screen effects.",
    limits: [
      "hue wraps around 360. grid is clamped to 16-160 px, and 0 hides it. glow is clamped to 0-100 and scale to 80-130.",
      "A look is described by the top level of a script: each run starts from the default look, so a theme call inside a callback changes the live page but is gone at the next run.",
    ],
    samples: ["theme-look"],
  },
  "site/fx": {
    summary: "One-shot effects: glitch, shake, flash, sparks, scan, decode and typeout.",
    limits: [
      "glitch is clamped to 50-2000 ms and shake to 1-10. typeout text is cut to 120 characters.",
      "A single run or callback plays at most 24 one-shot effects (effects, toasts, sounds and navigation together).",
      "With prefers-reduced-motion set, every effect becomes one soft outline flash.",
    ],
    samples: ["fx-effects"],
  },
  "site/ui": {
    summary: "Toasts, the banner, and prompts that use the command palette.",
    limits: [
      "Toasts are cut to 160 characters, the banner to 200.",
      "A pick shows up to 200 items; titles, placeholders and item fields are cut to 60 or 80 characters, and the confirm label to 16.",
      "Only one prompt is open at a time: opening another answers the first with null.",
    ],
    samples: ["ui-prompts"],
  },
  "site/keys": {
    summary: "Key bindings, sequences and modes, in the style of rex.bind.",
    limits: [
      "At most 128 bindings. A binding string is at most 64 characters, with at most 4 keys in a sequence and 1 second allowed between them.",
      "Modifiers are ctrl, alt, shift and meta (also control, option, opt, cmd, command and super). Named keys include escape, enter, space, tab, backspace, up, down, left and right.",
      "ctrl+k, meta+k and the backtick belong to the page and cannot be bound. Keys are ignored while the visitor is typing in a field, and while the console or palette is open.",
      "A mode name is a lowercase letter followed by up to 15 letters, digits or underscores. An exclusive mode ignores the global bindings and swallows keys nobody bound.",
    ],
    samples: ["keys-bindings"],
  },
  "site/time": {
    summary: "Timers: after, every and cancel.",
    limits: [
      "after waits at least 100 ms and every at least 250 ms; both at most 24 hours. Shorter values are raised to the minimum.",
      "At most 20 timers live at once. every timers pause while the tab is hidden and resume when it is shown.",
      "A callback that faults, or a timer whose callback has gone, stops repeating.",
      "Each callback runs with a fresh step budget.",
    ],
    samples: ["time-timers"],
  },
  "site/sound": {
    summary: "Small synthesized sounds.",
    limits: [
      "beep is clamped to 40-4000 Hz and 10-1000 ms. chord plays at most 6 notes, with the same limits.",
      "At most 20 sounds a second. Nothing plays before the visitor has interacted with the page, while sound is muted, or when the visitor prefers reduced motion.",
    ],
    samples: ["sound-notes"],
  },
  card: {
    summary: "Draw an SVG card from a GitHub profile with canvas-style calls.",
    limits: [
      "A card is 100-1200 px wide and 50-1200 px high (default 495 by 195). Positions may sit up to 50 px outside it; sizes and numbers are clamped.",
      "A render records at most 2,000 draw calls; the next one faults. The SVG is limited to 3,000 elements and about 600 KB, and the text of one text call to 300 characters.",
      "user.days holds up to 371 days, user.languages up to 8 entries and user.top up to 6.",
      'Colours are "#rgb", "#rrggbb", "#rrggbbaa", "none", or "@name" for a gradient defined earlier. Anything else is ignored and the pen keeps its previous colour.',
    ],
    samples: [
      "card-minimal",
      "card-pen",
      "card-gradient",
      "card-charts",
      "card-motion",
      "card-helpers",
      "card-params",
      "card-repos",
    ],
  },
};
