"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { KONAMI, normalizeEvent } from "@/lib/eitri/keys";
import { LIMITS } from "@/lib/eitri/model";
import { markGesture } from "@/lib/eitri/sound";
import { useEngine } from "./engine-context";

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

const SECTION_IDS = ["top", "work", "log", "systems", "contact"];

// Page-level listeners that feed the engine: keys, pointer, idle, visibility,
// the Konami code and which section is on screen. Renders nothing.
export function SiteEvents() {
  const engine = useEngine();
  const pathname = usePathname();

  // Pointer, idle/active, visibility.
  useEffect(() => {
    let last = performance.now();
    let idle = false;
    const touch = () => {
      last = performance.now();
      if (idle) {
        idle = false;
        engine.emit("active");
      }
    };
    const onPointer = (e: PointerEvent) => {
      engine.pointer = {
        x: e.clientX / Math.max(1, window.innerWidth),
        y: e.clientY / Math.max(1, window.innerHeight),
      };
      touch();
    };
    const onDown = () => {
      markGesture();
      touch();
    };
    const timer = setInterval(() => {
      if (!idle && performance.now() - last >= LIMITS.idleMs) {
        idle = true;
        engine.emit("idle");
      }
    }, 1000);
    const onVisibility = () => engine.setVisible(!document.hidden);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", touch, { passive: true });
    window.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", touch);
      window.removeEventListener("touchstart", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [engine]);

  // Keyboard: the two built-in shortcuts, then bindings, then "key" events.
  useEffect(() => {
    let konami = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return;
      markGesture();
      const key = normalizeEvent(e);
      if (!key) return;

      // Reserved: the palette works everywhere, even while typing.
      if (key === "ctrl+k" || key === "meta+k") {
        e.preventDefault();
        engine.togglePalette();
        return;
      }
      const editing = isEditable(e.target);
      if (key === "`" && !editing) {
        e.preventDefault();
        engine.toggleConsole();
        return;
      }
      if (editing) return;
      const s = engine.getState();
      if (s.consoleOpen || s.paletteOpen || s.prompt) return;

      if (!e.repeat) {
        const want = KONAMI[konami];
        konami =
          e.key.toLowerCase() === want ? konami + 1 : e.key.toLowerCase() === KONAMI[0] ? 1 : 0;
        if (konami === KONAMI.length) {
          konami = 0;
          engine.emit("konami");
        }
      }
      if (e.repeat) return;
      if (engine.pressKey(key)) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [engine]);

  // Which section sits at the middle of the viewport (home page only).
  useEffect(() => {
    if (pathname !== "/") return;
    const targets = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) engine.emit("section", { section: entry.target.id });
        }
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, [engine, pathname]);

  return null;
}
