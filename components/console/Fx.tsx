"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { FxCommand } from "@/lib/eitri/model";
import { useEngine } from "./engine-context";

const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Overlay {
  id: number;
  kind: "flash" | "scan" | "calm" | "slices";
  style?: CSSProperties;
  bars?: { top: number; height: number; dx: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

let overlayId = 0;

// One-shot effects. State is never kept: each effect leaves the page as it was.
// Under prefers-reduced-motion every effect becomes one soft accent outline.
export function FxLayer() {
  const engine = useEngine();
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const root = document.documentElement;
    const add = (o: Omit<Overlay, "id">, ms: number) => {
      const id = ++overlayId;
      setOverlays((list) => [...list.slice(-5), { ...o, id }]);
      setTimeout(() => setOverlays((list) => list.filter((x) => x.id !== id)), ms);
    };
    const attr = (name: string, ms: number) => {
      root.setAttribute(name, "on");
      clearTimeout(timers.current[name]);
      timers.current[name] = setTimeout(() => root.removeAttribute(name), ms);
    };
    const calm = (rect?: DOMRect) =>
      add(
        {
          kind: "calm",
          style: rect
            ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            : { inset: 0 },
        },
        700,
      );

    const draw = () => {
      const el = canvas.current;
      const ctx = el?.getContext("2d");
      if (!el || !ctx) return;
      ctx.clearRect(0, 0, el.width, el.height);
      const dpr = el.width / window.innerWidth;
      const hue = getComputedStyle(root).getPropertyValue("--hue").trim() || "195";
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= 1;
        const a = Math.max(0, p.life / p.max);
        ctx.fillStyle = `oklch(0.9 0.15 ${hue} / ${a.toFixed(2)})`;
        ctx.fillRect(p.x * dpr, p.y * dpr, p.size * dpr, p.size * dpr);
      }
      particles.current = particles.current.filter((p) => p.life > 0);
      raf.current = particles.current.length ? requestAnimationFrame(draw) : 0;
      if (!particles.current.length) ctx.clearRect(0, 0, el.width, el.height);
    };

    const sparks = (slug: string) => {
      const target = slug
        ? document.querySelector(`[data-project=${JSON.stringify(slug)}]`)
        : document.getElementById("hero");
      const rect = target?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (prefersReduced()) return calm(rect);
      const el = canvas.current;
      if (!el) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(window.innerWidth * dpr);
      el.height = Math.round(window.innerHeight * dpr);
      for (let i = 0; i < 44; i++) {
        // Spawn along the rectangle's edge, fly outwards.
        const side = Math.floor(Math.random() * 4);
        const t = Math.random();
        const x =
          side === 0
            ? rect.left + t * rect.width
            : side === 1
              ? rect.right
              : side === 2
                ? rect.left + t * rect.width
                : rect.left;
        const y =
          side === 0
            ? rect.top
            : side === 1
              ? rect.top + t * rect.height
              : side === 2
                ? rect.bottom
                : rect.top + t * rect.height;
        const dir = [(Math.PI * 3) / 2, 0, Math.PI / 2, Math.PI][side] ?? 0;
        const ang = dir + (Math.random() - 0.5) * 1.4;
        const speed = 1.5 + Math.random() * 4;
        const max = 26 + Math.random() * 26;
        particles.current.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 1,
          life: max,
          max,
          size: 1.5 + Math.random() * 2.5,
        });
      }
      particles.current = particles.current.slice(-240);
      if (!raf.current) raf.current = requestAnimationFrame(draw);
    };

    const handle = (fx: FxCommand) => {
      const reduced = prefersReduced();
      switch (fx.kind) {
        case "glitch":
          if (reduced) return calm();
          root.style.setProperty("--fx-ms", `${fx.ms}ms`);
          attr("data-glitch", fx.ms);
          add(
            {
              kind: "slices",
              bars: Array.from({ length: 5 }, () => ({
                top: Math.random() * 90,
                height: 2 + Math.random() * 9,
                dx: (Math.random() - 0.5) * 40,
              })),
            },
            fx.ms,
          );
          break;
        case "shake":
          if (reduced) return calm();
          root.style.setProperty("--shake", String(fx.strength));
          attr("data-shake", 480);
          break;
        case "flash":
          add({ kind: reduced ? "calm" : "flash", style: reduced ? { inset: 0 } : undefined }, 700);
          break;
        case "scan":
          if (reduced) return calm();
          add({ kind: "scan" }, 1100);
          break;
        case "sparks":
          sparks(fx.slug);
          break;
      }
    };

    const off = engine.onCommand((c) => {
      if (c.t === "fx") handle(c.fx);
    });
    const live = timers.current;
    return () => {
      off();
      cancelAnimationFrame(raf.current);
      for (const t of Object.values(live)) clearTimeout(t);
      root.removeAttribute("data-glitch");
      root.removeAttribute("data-shake");
    };
  }, [engine]);

  return (
    <div aria-hidden="true">
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[75] size-full" />
      {overlays.map((o) =>
        o.kind === "slices" ? (
          <div key={o.id} className="pointer-events-none fixed inset-0 z-[75]">
            {o.bars?.map((b) => (
              <span
                key={b.top}
                className="fx-slice absolute right-0 left-0"
                style={{ top: `${b.top}%`, height: b.height, "--dx": `${b.dx}px` } as CSSProperties}
              />
            ))}
          </div>
        ) : (
          <div key={o.id} className={`fx-${o.kind}`} style={o.style} />
        ),
      )}
    </div>
  );
}
