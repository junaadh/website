// Built-in actions: dotted names, always present, listed in the palette.
// Script actions (no dots) are registered by programs, see engine.ts.

import type { Engine } from "./engine";
import { type ActionInfo, SECTIONS, WEATHERS } from "./model";

export interface Builtin {
  info: ActionInfo;
  run: () => void;
}

const SECTION_TITLE: Record<string, string> = {
  top: "Go to top",
  work: "Go to Work",
  log: "Go to Log",
  systems: "Go to Systems",
  contact: "Go to Uplink (contact)",
};

export function builtinActions(engine: Engine): Builtin[] {
  const make = (
    name: string,
    title: string,
    category: string,
    description: string,
    keywords: string[],
    run: () => void,
  ): Builtin => ({
    info: { name, title, description, category, keywords, builtin: true },
    run,
  });

  const list: Builtin[] = [
    make(
      "console.open",
      "Open console",
      "Console",
      "Write and run Eitri scripts",
      ["eitri", "editor", "script", "code"],
      () => engine.openConsole(),
    ),
    make(
      "palette.open",
      "Open command palette",
      "Console",
      "Search every action",
      ["commands", "search"],
      () => engine.openPalette(),
    ),
    make(
      "look.reset",
      "Reset the page",
      "Look",
      "Clear the saved script and restore the defaults",
      ["default", "clear", "restore"],
      () => {
        engine.reset();
      },
    ),
    make(
      "look.crt",
      "Toggle CRT glass",
      "Look",
      "Curved-glass vignette and colour fringe",
      ["screen", "retro"],
      () => engine.patchLook({ crt: !engine.getState().look.crt }),
    ),
    make(
      "look.mono",
      "Toggle mono type",
      "Look",
      "The whole page in the mono face",
      ["font", "typewriter"],
      () => engine.patchLook({ mono: !engine.getState().look.mono }),
    ),
    make(
      "look.weather_cycle",
      "Cycle weather",
      "Look",
      "Clear, rain, storm, snow, static, aurora, matrix",
      ["rain", "snow", "matrix", "storm"],
      () => {
        const now = engine.getState().look.weather;
        const next = WEATHERS[(WEATHERS.indexOf(now) + 1) % WEATHERS.length] ?? "Clear";
        engine.patchLook({ weather: next });
        engine.toast(`Weather: ${next}`);
      },
    ),
    make(
      "look.mute",
      "Toggle sound",
      "Look",
      "Mute or unmute synthesized sounds",
      ["audio", "beep", "silence"],
      () => {
        const on = !engine.getState().userMuted;
        engine.setUserMuted(on);
        engine.toast(on ? "Sound muted" : "Sound on");
      },
    ),
  ];

  for (const s of SECTIONS) {
    list.push(
      make(
        `section.${s}`,
        SECTION_TITLE[s] ?? s,
        "Navigate",
        `Scroll to the ${s} section`,
        ["jump", "scroll", s],
        () => engine.goto(s),
      ),
    );
  }
  for (const p of engine.projects) {
    list.push(
      make(
        `go.${p.slug}`,
        `Go to ${p.name.toUpperCase()}`,
        "Projects",
        `${p.kind} · ${p.year}`,
        [p.slug, p.kind, ...p.stack],
        () => engine.openProject(p.slug),
      ),
    );
  }
  return list;
}

/** Keys that are built in, shown beside their actions in the palette. */
export const BUILTIN_KEYS: Record<string, string> = {
  "console.open": "`",
  "palette.open": "ctrl+k",
};
