"use client";

import { useEffect, useRef } from "react";
import type { CursorKind } from "@/lib/eitri/model";

const TRAIL = 14;

// "Ring" and "Trail" cursors. The native cursor stays (it is the accessible
// one); these follow it. "Crosshair" is pure CSS (data-cursor on <html>).
// Skipped on touch screens, and eased motion is dropped under reduced motion.
export function CursorLayer({ kind }: { kind: CursorKind }) {
  const ring = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (kind !== "Ring" && kind !== "Trail") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    const dots: { x: number; y: number }[] = [];
    let raf = 0;
    let hot = false;
    let moved = false;

    const el = ring.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    const fit = () => {
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(window.innerWidth * dpr);
      cv.height = Math.round(window.innerHeight * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const k = reduced ? 1 : 0.22;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      if (el && kind === "Ring") {
        el.style.transform =
          "translate3d(" +
          (pos.x - 14) +
          "px," +
          (pos.y - 14) +
          "px,0) scale(" +
          (hot ? 1.8 : 1) +
          ")";
      }
      if (ctx && cv && kind === "Trail") {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (moved && !reduced) dots.unshift({ x: pos.x, y: pos.y });
        if (reduced) dots.length = 0;
        dots.length = Math.min(dots.length, TRAIL);
        if (!moved && dots.length) dots.pop();
        const hue = getComputedStyle(root).getPropertyValue("--hue").trim() || "195";
        dots.forEach((d, i) => {
          const a = 1 - i / TRAIL;
          ctx.fillStyle = `oklch(0.88 0.15 ${hue} / ${(a * 0.7).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 1.5 + a * 3, 0, Math.PI * 2);
          ctx.fill();
        });
        moved = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      moved = true;
      hot = e.target instanceof Element && e.target.closest("a, button, [role=option]") !== null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", fit);
    };
  }, [kind]);

  if (kind === "Ring") {
    return <div ref={ring} aria-hidden="true" className="fx-ring" />;
  }
  if (kind === "Trail") {
    return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[90] size-full" />;
  }
  return null;
}
