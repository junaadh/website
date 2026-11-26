"use client";

import { useEffect, useRef } from "react";
import type { Weather } from "@/lib/eitri/model";

interface Painter {
  /** ms between frames; 0 = every animation frame */
  interval: number;
  draw(ctx: CanvasRenderingContext2D, dt: number, hue: number, animate: boolean): void;
}

const accent = (hue: number, alpha: number, l = 0.86, c = 0.15) =>
  `oklch(${l} ${c} ${hue} / ${alpha})`;

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

function rain(w: number, h: number, storm: boolean): Painter {
  const count = Math.round(Math.min(220, Math.max(60, w / 9)) * (storm ? 2.2 : 1));
  const wind = storm ? 0.28 : 0.12;
  const make = (anywhere: boolean): Drop => ({
    x: Math.random() * (w + h * wind),
    y: anywhere ? Math.random() * h : -40,
    len: (storm ? 18 : 10) + Math.random() * (storm ? 26 : 18),
    speed: (storm ? 1.1 : 0.6) + Math.random() * (storm ? 0.9 : 0.5), // px per ms
    alpha: 0.1 + Math.random() * (storm ? 0.4 : 0.3),
  });
  const drops = Array.from({ length: count }, () => make(true));
  let flash = 0;
  let nextFlash = 1500 + Math.random() * 4000;

  return {
    interval: 0,
    draw(ctx, dt, hue, animate) {
      ctx.lineCap = "round";
      ctx.lineWidth = storm ? 1.4 : 1;
      for (const d of drops) {
        if (animate) {
          d.y += d.speed * dt;
          d.x -= d.speed * dt * wind;
          if (d.y > h + 40 || d.x < -40) Object.assign(d, make(false));
        }
        ctx.strokeStyle = accent(hue, d.alpha);
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * wind, d.y - d.len);
        ctx.stroke();
      }
      if (storm && animate) {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flash = 0.55 + Math.random() * 0.3;
          // sometimes a quick second strike
          nextFlash = Math.random() < 0.4 ? 120 + Math.random() * 160 : 3500 + Math.random() * 7000;
        }
        if (flash > 0.01) {
          ctx.fillStyle = accent(hue, flash * 0.22, 0.97, 0.04);
          ctx.fillRect(0, 0, w, h);
          flash *= 0.88 ** (dt / 16);
        }
      }
    },
  };
}

function grain(w: number, h: number): Painter {
  const sw = Math.max(1, Math.ceil(w / 4));
  const sh = Math.max(1, Math.ceil(h / 4));
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d");
  const img = sctx?.createImageData(sw, sh);
  return {
    interval: 70,
    draw(ctx, _dt, _hue, _animate) {
      if (!sctx || !img) return;
      const px = img.data;
      for (let i = 0; i < px.length; i += 4) {
        const v = 120 + Math.random() * 135;
        px[i] = v;
        px[i + 1] = v;
        px[i + 2] = v;
        px[i + 3] = Math.random() < 0.55 ? Math.random() * 38 : 0;
      }
      sctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.6 + Math.random() * 0.4; // flicker
      ctx.drawImage(small, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  };
}

function aurora(w: number, h: number): Painter {
  const bands = [
    { base: 0.16, amp: 0.07, freq: 1.3, speed: 0.00004, shift: 0, height: 0.34, alpha: 0.2 },
    { base: 0.24, amp: 0.09, freq: 0.9, speed: -0.00003, shift: 40, height: 0.3, alpha: 0.15 },
    { base: 0.12, amp: 0.05, freq: 2.1, speed: 0.00006, shift: -35, height: 0.26, alpha: 0.12 },
  ];
  let t = 0;
  return {
    interval: 33,
    draw(ctx, dt, hue, animate) {
      if (animate) t += dt;
      ctx.globalCompositeOperation = "screen";
      bands.forEach((b, i) => {
        const top = h * b.base;
        const edge = (x: number) =>
          top +
          Math.sin((x / w) * Math.PI * b.freq + t * b.speed * 12 + i * 2) * h * b.amp +
          Math.sin((x / w) * Math.PI * b.freq * 2.3 - t * b.speed * 7) * h * b.amp * 0.4;
        const bandH = h * b.height;
        const g = ctx.createLinearGradient(0, top - h * b.amp, 0, top + bandH);
        const hh = (hue + b.shift + 360) % 360;
        g.addColorStop(0, accent(hh, 0, 0.8, 0.14));
        g.addColorStop(0.35, accent(hh, b.alpha, 0.8, 0.14));
        g.addColorStop(1, accent(hh, 0, 0.8, 0.14));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, edge(0));
        for (let x = 24; x <= w + 24; x += 24) ctx.lineTo(x, edge(x));
        for (let x = w + 24; x >= 0; x -= 24) ctx.lineTo(x, edge(x) + bandH);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

function snow(w: number, h: number): Painter {
  const count = Math.round(Math.min(160, Math.max(50, w / 10)));
  const make = (anywhere: boolean) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : -10,
    r: 0.8 + Math.random() * 2.2,
    speed: 0.03 + Math.random() * 0.06, // px per ms
    phase: Math.random() * Math.PI * 2,
    alpha: 0.25 + Math.random() * 0.5,
  });
  const flakes = Array.from({ length: count }, () => make(true));
  return {
    interval: 0,
    draw(ctx, dt, hue, animate) {
      for (const f of flakes) {
        if (animate) {
          f.y += f.speed * dt * (0.6 + f.r / 3);
          f.x += Math.sin(f.phase + f.y / 70) * 0.25;
          if (f.y > h + 10) Object.assign(f, make(false));
        }
        ctx.fillStyle = accent(hue, f.alpha, 0.97, 0.03);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

const MATRIX_GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789:.=*+-<>";

// Columns of falling glyphs in the accent colour, faint enough to read over.
function matrix(w: number, h: number): Painter {
  const size = 16;
  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);
  const streams = Array.from({ length: cols }, () => ({
    head: Math.random() * rows * 1.5 - rows * 0.5,
    speed: 0.006 + Math.random() * 0.016, // cells per ms
    length: 8 + Math.floor(Math.random() * 14),
  }));
  let t = 0;
  const glyph = (c: number, r: number) =>
    MATRIX_GLYPHS[(c * 131 + r * 17 + Math.floor(t / 260) * (c % 3)) % MATRIX_GLYPHS.length];
  return {
    interval: 50,
    draw(ctx, dt, hue, animate) {
      if (animate) t += dt;
      ctx.font = `${size - 2}px ui-monospace, monospace`;
      ctx.textBaseline = "top";
      streams.forEach((s, c) => {
        if (animate) {
          s.head += s.speed * dt;
          if (s.head - s.length > rows) {
            s.head = -Math.random() * 10;
            s.speed = 0.006 + Math.random() * 0.016;
          }
        }
        const head = Math.floor(s.head);
        for (let i = 0; i < s.length; i++) {
          const r = head - i;
          if (r < 0 || r > rows) continue;
          const fade = 1 - i / s.length;
          ctx.fillStyle =
            i === 0 ? accent(hue, 0.7, 0.97, 0.05) : accent(hue, fade * 0.32, 0.8, 0.16);
          ctx.fillText(glyph(c, r) ?? "0", c * size, r * size);
        }
      });
    },
  };
}

function makePainter(kind: Weather, w: number, h: number): Painter | null {
  switch (kind) {
    case "Rain":
      return rain(w, h, false);
    case "Storm":
      return rain(w, h, true);
    case "Snow":
      return snow(w, h);
    case "Matrix":
      return matrix(w, h);
    case "Static":
      return grain(w, h);
    case "Aurora":
      return aurora(w, h);
    default:
      return null;
  }
}

// Fixed canvas behind the content. Clear renders no canvas and runs no loop.
export function WeatherLayer({ kind, hue }: { kind: Weather; hue: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef(hue);
  useEffect(() => {
    hueRef.current = hue;
  }, [hue]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || kind === "Clear") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let painter: Painter | null = null;
    let w = 0;
    let h = 0;
    let prev = 0;
    let lastDraw = 0;

    const paint = (dt: number, animate: boolean) => {
      if (!painter) return;
      ctx.clearRect(0, 0, w, h);
      painter.draw(ctx, dt, hueRef.current, animate);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(50, prev ? now - prev : 16);
      prev = now;
      if (painter && now - lastDraw < painter.interval) return;
      lastDraw = now;
      paint(dt, true);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      prev = 0;
    };
    const start = () => {
      stop();
      if (reduced.matches) {
        paint(0, false); // one still frame
      } else if (!document.hidden) {
        raf = requestAnimationFrame(tick);
      }
    };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      painter = makePainter(kind, w, h);
      start();
    };

    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    return () => {
      stop();
      window.removeEventListener("resize", fit);
      document.removeEventListener("visibilitychange", start);
      reduced.removeEventListener("change", start);
    };
  }, [kind]);

  if (kind === "Clear") return null;
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas is not focusable; this one is decorative
    <canvas
      ref={canvas}
      aria-hidden="true"
      data-weather
      className="pointer-events-none fixed inset-0 z-[-1] size-full"
    />
  );
}
