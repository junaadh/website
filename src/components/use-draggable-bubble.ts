import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, KeyboardEvent } from "react";

const size = 48;
const margin = 16;
const storageKey = "portfolio-bubble-position";

/* Release behaviour: a spring pulls the bubble horizontally to its edge while
   friction bleeds off the vertical throw, so a flick coasts and settles instead
   of snapping. Integrated at a fixed step so a dropped frame can't destabilise
   the spring. */
const stiffness = 210;
const damping = 21;
const friction = 4.5;
const restitution = 0.32;
const step = 1 / 120;
/* How far ahead the throw is projected when choosing an edge, so a fast flick
   crosses the midpoint rather than falling back to the nearer side. */
const lookahead = 0.12;

type Point = { x: number; y: number };

const bounds = () => ({
  x: Math.max(margin, innerWidth - size - margin),
  y: Math.max(margin, innerHeight - size - margin),
});
const clamp = (point: Point) => {
  const max = bounds();
  return {
    x: Math.max(margin, Math.min(max.x, point.x)),
    y: Math.max(margin, Math.min(max.y, point.y)),
  };
};
/** Resists past the edges instead of stopping dead, the way a sheet of paper would. */
const rubber = (value: number, min: number, max: number) =>
  value < min
    ? min - (min - value) * 0.35
    : value > max
      ? max + (value - max) * 0.35
      : value;
const remember = (point: Point) => {
  const max = bounds();
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ x: point.x / max.x, y: point.y / max.y }),
    );
  } catch {
    /* Moving the bubble still works when storage is unavailable. */
  }
};
const still = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function useDraggableBubble(onDrag: () => void) {
  const [position, setPosition] = useState<Point | null>(null);
  const [viewport, setViewport] = useState({
    width: innerWidth,
    height: innerHeight,
  });
  const [dragging, setDragging] = useState(false);
  const [tilt, setTilt] = useState(0);
  const current = useRef<Point>({ x: margin, y: bounds().y });
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const frame = useRef(0);
  const gesture = useRef<{
    id: number;
    start: Point;
    origin: Point;
    at: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  /** Runs the release physics until the bubble comes to rest on an edge. */
  const settle = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const max = bounds();
    const projected = current.current.x + velocity.current.x * lookahead;
    const target = projected + size / 2 < innerWidth / 2 ? margin : max.x;
    if (still()) {
      current.current = clamp({ x: target, y: current.current.y });
      velocity.current = { x: 0, y: 0 };
      setPosition({ ...current.current });
      setTilt(0);
      remember(current.current);
      return;
    }
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      carry += Math.min((now - last) / 1000, 0.05);
      last = now;
      while (carry >= step) {
        carry -= step;
        const v = velocity.current;
        const p = current.current;
        v.x += ((target - p.x) * stiffness - v.x * damping) * step;
        v.y -= v.y * friction * step;
        p.x += v.x * step;
        p.y += v.y * step;
        if (p.y < margin) {
          p.y = margin;
          v.y = Math.abs(v.y) * restitution;
        } else if (p.y > max.y) {
          p.y = max.y;
          v.y = -Math.abs(v.y) * restitution;
        }
      }
      const settled =
        Math.abs(target - current.current.x) < 0.4 &&
        Math.abs(velocity.current.x) < 8 &&
        Math.abs(velocity.current.y) < 8;
      if (settled) {
        current.current = { x: target, y: current.current.y };
        velocity.current = { x: 0, y: 0 };
        setPosition({ ...current.current });
        setTilt(0);
        remember(current.current);
        return;
      }
      setPosition({ ...current.current });
      setTilt(Math.max(-14, Math.min(14, velocity.current.x * 0.018)));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        const max = bounds();
        current.current = clamp({ x: saved.x * max.x, y: saved.y * max.y });
      }
    } catch {
      /* Default to the bottom-left corner. */
    }
    setPosition(current.current);
    let previous = bounds();
    const resize = () => {
      cancelAnimationFrame(frame.current);
      velocity.current = { x: 0, y: 0 };
      const max = bounds();
      current.current = clamp({
        x: (current.current.x / previous.x) * max.x,
        y: (current.current.y / previous.y) * max.y,
      });
      previous = max;
      setPosition({ ...current.current });
      setTilt(0);
      setViewport({ width: innerWidth, height: innerHeight });
    };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (active.moved) settle();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return {
    position,
    viewport,
    dragging,
    tilt,
    consumeDragClick: () => {
      const suppressed = suppressClick.current;
      suppressClick.current = false;
      return suppressed;
    },
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        cancelAnimationFrame(frame.current);
        velocity.current = { x: 0, y: 0 };
        suppressClick.current = false;
        gesture.current = {
          id: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          origin: current.current,
          at: performance.now(),
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        const dx = event.clientX - active.start.x;
        const dy = event.clientY - active.start.y;
        if (!active.moved && Math.hypot(dx, dy) < 6) return;
        if (!active.moved) {
          active.moved = true;
          suppressClick.current = true;
          setDragging(true);
          onDrag();
        }
        const max = bounds();
        const next = {
          x: rubber(active.origin.x + dx, margin, max.x),
          y: rubber(active.origin.y + dy, margin, max.y),
        };
        // Blend samples so one jittery frame can't dominate the throw.
        const now = performance.now();
        const elapsed = Math.max(now - active.at, 8) / 1000;
        velocity.current = {
          x:
            ((next.x - current.current.x) / elapsed) * 0.7 +
            velocity.current.x * 0.3,
          y:
            ((next.y - current.current.y) / elapsed) * 0.7 +
            velocity.current.y * 0.3,
        };
        active.at = now;
        current.current = next;
        setPosition(next);
        setTilt(Math.max(-14, Math.min(14, velocity.current.x * 0.018)));
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        // Arrow keys stay deliberate and unsprung, so the target is predictable.
        const offsets: Record<string, Point> = {
          ArrowLeft: { x: -24, y: 0 },
          ArrowRight: { x: 24, y: 0 },
          ArrowUp: { x: 0, y: -24 },
          ArrowDown: { x: 0, y: 24 },
        };
        if (event.key === "Enter" || event.key === " ")
          suppressClick.current = false;
        const delta = offsets[event.key];
        if (!delta) return;
        event.preventDefault();
        cancelAnimationFrame(frame.current);
        velocity.current = { x: 0, y: 0 };
        onDrag();
        current.current = clamp({
          x: current.current.x + delta.x,
          y: current.current.y + delta.y,
        });
        setPosition({ ...current.current });
        remember(current.current);
      },
    },
  };
}
