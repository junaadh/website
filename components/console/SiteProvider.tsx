"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { ProjectData } from "@/lib/eitri/eitri";
import { Engine } from "@/lib/eitri/engine";
import type { Look } from "@/lib/eitri/model";
import { DEFAULT_LOOK } from "@/lib/eitri/model";
import { CursorLayer } from "./CursorLayer";
import { EngineContext, useEngine, useEngineState, useLook } from "./engine-context";
import { FxLayer } from "./Fx";
import { ModeChip } from "./ModeChip";
import { ScreenOverlays } from "./ScreenOverlays";
import { SiteEvents } from "./SiteEvents";
import { ToastHost } from "./Toasts";
import { WeatherLayer } from "./WeatherLayer";

// The editor and the palette are only fetched when first opened.
const Console = dynamic(() => import("./Console").then((m) => m.Console), { ssr: false });
const Palette = dynamic(() => import("./Palette").then((m) => m.Palette), { ssr: false });

// Look -> DOM. Defaults remove the override so globals.css stays the source of truth.
function applyToDom(look: Look) {
  const root = document.documentElement;
  const set = (name: string, value: string, isDefault: boolean) =>
    isDefault ? root.style.removeProperty(name) : root.style.setProperty(name, value);
  set("--hue", String(look.hue), look.hue === DEFAULT_LOOK.hue);
  set("--glow", String(look.glow), look.glow === DEFAULT_LOOK.glow);
  set(
    "--grid",
    `${look.grid || DEFAULT_LOOK.grid}px`,
    look.grid === DEFAULT_LOOK.grid || look.grid === 0,
  );
  const flag = (name: string, on: boolean, value = "on") =>
    on ? root.setAttribute(name, value) : root.removeAttribute(name);
  flag("data-grid", look.grid === 0, "off");
  flag("data-scanlines", !look.scanlines, "off");
  flag("data-mono", look.mono);
  flag("data-crt", look.crt);
  flag("data-flicker", look.flicker);
  flag("data-invert", look.invert);
  flag("data-cursor", look.cursor !== "Default", look.cursor.toLowerCase());
  if (look.scale === 100) root.style.removeProperty("font-size");
  else root.style.fontSize = `${look.scale}%`;
}

function Runtime() {
  const engine = useEngine();
  const look = useLook();
  const router = useRouter();
  const consoleOpen = useEngineState((s) => s.consoleOpen);
  const paletteOpen = useEngineState((s) => s.paletteOpen);
  const prompt = useEngineState((s) => s.prompt);

  useEffect(() => applyToDom(look), [look]);
  useEffect(() => {
    engine.setHost({ navigate: (href) => router.push(href) });
  }, [engine, router]);

  // Boot once: replay a shared or saved script (silently).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    engine.boot();
  }, [engine]);

  return (
    <>
      <WeatherLayer kind={look.weather} hue={look.hue} />
      <ScreenOverlays crt={look.crt} flicker={look.flicker} />
      <CursorLayer kind={look.cursor} />
      <FxLayer />
      <SiteEvents />
      <ModeChip />
      {consoleOpen && <Console />}
      {(paletteOpen || prompt) && <Palette />}
      <ToastHost lifted={consoleOpen} />
    </>
  );
}

export function SiteProvider({
  projects,
  children,
}: {
  projects: ProjectData[];
  children: ReactNode;
}) {
  const [engine] = useState(() => new Engine(projects));
  return (
    <EngineContext.Provider value={engine}>
      <Runtime />
      {children}
    </EngineContext.Provider>
  );
}
