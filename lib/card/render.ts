// Effects -> SVG. This is the security boundary of the card renderer.
//
// The SVG is served from our own origin and embedded in READMEs, and the
// script that produced the effects is written by whoever builds the URL. So
// nothing the script (or GitHub) says is trusted:
//
//  - every piece of text is XML-escaped, and characters XML cannot carry are dropped;
//  - colours are matched against a strict grammar, never copied through;
//  - every number is clamped to a sane range;
//  - tag and attribute names are fixed strings in this file, never data;
//  - no <script>, no <foreignObject>, no external hrefs. The only image is the
//    avatar, and only as a base64 data: URL of a raster type;
//  - ids are generated here (g0, g1, ...), never taken from a script;
//  - the element count is capped.
//
// Pure TypeScript with no DOM APIs.

import type { CardUser, Effect, Value } from "./types";

export const DEFAULT_WIDTH = 495;
export const DEFAULT_HEIGHT = 195;
const MARGIN = 50; // how far outside the card a position may sit
const MAX_ELEMENTS = 3000;
const MAX_BYTES = 600_000;
const MAX_GRADIENTS = 64;
const GRADIENT_BYTES = 280;
const MAX_TEXT = 300;
const MAX_AVATARS = 2;
const MAX_AVATAR_URL = 150_000;

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

// ── Validation helpers ─────────────────────────────────────────────────────

const num = (v: Value | undefined): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const clamp = (v: Value | undefined, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(num(v))));
const str = (v: Value | undefined): string => (typeof v === "string" ? v : "");
const fmt = (n: number): string => String(Math.round(n * 1000) / 1000);

/** XML text and attribute escaping, dropping what XML 1.0 cannot represent. */
export function esc(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    const legal =
      c === 0x9 ||
      c === 0xa ||
      c === 0xd ||
      (c >= 0x20 && c <= 0xd7ff) ||
      (c >= 0xe000 && c <= 0xfffd) ||
      c >= 0x10000;
    if (!legal) continue;
    out +=
      ch === "&"
        ? "&amp;"
        : ch === "<"
          ? "&lt;"
          : ch === ">"
            ? "&gt;"
            : ch === '"'
              ? "&quot;"
              : ch === "'"
                ? "&apos;"
                : ch;
  }
  return out;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

interface Paint {
  /** The attribute value: "#rrggbb", "none" or "url(#gN)". */
  value: string;
  /** Alpha from a #rrggbbaa colour, 0-1. */
  alpha: number;
}

/** "#rgb", "#rrggbb", "#rrggbbaa" or "none"; null for anything else. */
function solid(color: string): Paint | null {
  const c = color.trim();
  if (c.toLowerCase() === "none") return { value: "none", alpha: 1 };
  if (!HEX.test(c)) return null;
  const h = c.slice(1).toLowerCase();
  if (h.length === 3) return { value: `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`, alpha: 1 };
  if (h.length === 6) return { value: `#${h}`, alpha: 1 };
  return { value: `#${h.slice(0, 6)}`, alpha: Number.parseInt(h.slice(6), 16) / 255 };
}

// ── Icons: 16x16 outlines, drawn by this file ──────────────────────────────

const ICONS: Record<string, string> = {
  Star: "M8 1.8l1.9 4.2 4.6.4-3.5 3 1.1 4.5L8 11.5l-4.1 2.4L5 9.4 1.5 6.4l4.6-.4z",
  Fork: "M4 6.2V7.5Q4 9 5.5 9H10.5Q12 9 12 7.5V6.2M8 9v1.8M2.4 4.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M10.4 4.6a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M6.4 12.4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0",
  Repo: "M4 2h8.5v10.5H4A1.5 1.5 0 0 0 2.5 14V3.5A1.5 1.5 0 0 1 4 2zM2.5 14A1.5 1.5 0 0 0 4 15.5h8.5M5.5 5h4.5",
  People: "M8 2.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5zM3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5",
  Commit: "M1.5 8h4M10.5 8h4M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z",
  PullRequest:
    "M4 5.6v4.8M12 10.4V6.5a2 2 0 0 0-2-2H8.5M10.2 2.6l-1.9 1.9 1.9 1.9M2.5 4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M2.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0",
  Issue: "M8 1.8a6.2 6.2 0 1 0 0 12.4a6.2 6.2 0 1 0 0-12.4zM8 4.8v3.8M8 11v.2",
  Location:
    "M8 14.5S3 9.6 3 6.3a5 5 0 0 1 10 0C13 9.6 8 14.5 8 14.5zM8 4.7a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2z",
  Flame:
    "M8 14.5c-2.6 0-4.2-1.7-4.2-3.9 0-2 1.5-3 2.3-4.7.4 1 1 1.4 1.6 1.7 0-2 .6-3.4 1.6-4.3.2 2.6 2.7 3.9 2.7 6.3 0 2.5-1.8 4.9-4 4.9z",
  Code: "M5.5 4L1.8 8l3.7 4M10.5 4l3.7 4-3.7 4M9.2 2.5L6.8 13.5",
  Calendar: "M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3",
};

// ── Data URL check for the avatar ──────────────────────────────────────────

const AVATAR = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const avatarOk = (url: unknown): url is string =>
  typeof url === "string" && url.length <= MAX_AVATAR_URL && AVATAR.test(url);

// ── The renderer ───────────────────────────────────────────────────────────

type Motion = "None" | "Fade" | "Rise" | "Pulse" | "Scan";
const MOTIONS: readonly string[] = ["None", "Fade", "Rise", "Pulse", "Scan"];

interface Gradient {
  id: string;
  from: Paint;
  to: Paint;
  angle: number;
}

/** What the pen is, between draws. */
interface Pen {
  fill: Paint | string;
  strokeColor: Paint;
  strokeWidth: number;
  size: number;
  weight: 400 | 500 | 700;
  mono: boolean;
  anchor: "start" | "middle" | "end";
  opacity: number; // 0-1
}

const WEIGHTS: Record<string, 400 | 500 | 700> = { Regular: 400, Medium: 500, Bold: 700 };
const ANCHORS: Record<string, Pen["anchor"]> = { Start: "start", Middle: "middle", End: "end" };

export interface RenderOptions {
  /** Shown to assistive tech; defaults to the user's name. */
  title?: string;
}

export function renderCard(effects: Effect[], user: CardUser, options: RenderOptions = {}): string {
  let width = DEFAULT_WIDTH;
  let height = DEFAULT_HEIGHT;
  let bg: { paint: Paint | string; radius: number } | null = null;
  let border: { paint: Paint; width: number } | null = null;
  let motion: Motion = "None";
  let scanColor: Paint | null = null;

  const gradients = new Map<string, Gradient>();
  let gradientCount = 0;
  const pen: Pen = {
    fill: { value: "#c9d1d9", alpha: 1 },
    strokeColor: { value: "none", alpha: 1 },
    strokeWidth: 0,
    size: 14,
    weight: 400,
    mono: false,
    anchor: "start",
    opacity: 1,
  };

  const body: string[] = []; // drawn elements, in order
  const defs: string[] = []; // clip paths for rounded images and bars
  let clipCount = 0;
  let avatars = 0;

  // Colours: "@name" resolves to a gradient defined earlier, else null.
  const paintOf = (color: string): Paint | string | null => {
    if (color.startsWith("@")) {
      const name = color.slice(1);
      const g = NAME.test(name) ? gradients.get(name) : undefined;
      return g ? `url(#${g.id})` : null;
    }
    return solid(color);
  };
  const attr = (name: string, paint: Paint | string, extraOpacity = 1): string => {
    if (typeof paint === "string") {
      return `${name}="${paint}"${extraOpacity < 1 ? ` ${name}-opacity="${fmt(extraOpacity)}"` : ""}`;
    }
    const a = paint.alpha * extraOpacity;
    return `${name}="${paint.value}"${a < 1 ? ` ${name}-opacity="${fmt(a)}"` : ""}`;
  };
  // Fill and stroke attributes from the pen.
  const fillAttrs = (): string => attr("fill", pen.fill, pen.opacity);
  const strokeAttrs = (): string =>
    pen.strokeWidth > 0 && (typeof pen.strokeColor === "string" || pen.strokeColor.value !== "none")
      ? `${attr("stroke", pen.strokeColor, pen.opacity)} stroke-width="${fmt(pen.strokeWidth)}"`
      : "";

  const px = (v: Value | undefined) => clamp(v, -MARGIN, width + MARGIN);
  const py = (v: Value | undefined) => clamp(v, -MARGIN, height + MARGIN);
  const length = (v: Value | undefined) => clamp(v, 0, Math.max(width, height) * 2);

  // Both the element count and the total size are capped, so no script can
  // make a response of unbounded size (a heatmap is one element of 371 cells).
  let bytes = 0;
  const push = (svg: string) => {
    if (body.length >= MAX_ELEMENTS || bytes + svg.length > MAX_BYTES) return;
    bytes += svg.length;
    body.push(svg);
  };
  // Clip paths and gradient definitions count toward the same byte budget.
  const pushDef = (def: string): boolean => {
    if (bytes + def.length > MAX_BYTES) return false;
    bytes += def.length;
    defs.push(def);
    return true;
  };

  for (const effect of effects) {
    const a = effect.args;
    switch (effect.fn) {
      case "card.size":
        width = clamp(a[0], 100, 1200);
        height = clamp(a[1], 50, 1200);
        break;
      case "card.background": {
        const paint = paintOf(str(a[0]));
        if (paint) bg = { paint, radius: clamp(a[1], 0, 600) };
        break;
      }
      case "card.border": {
        const paint = solid(str(a[0]));
        if (paint) border = { paint, width: clamp(a[1], 0, 20) };
        break;
      }
      case "card.gradient": {
        const name = str(a[0]);
        const from = solid(str(a[1]));
        const to = solid(str(a[2]));
        if (NAME.test(name) && from && to && from.value !== "none" && to.value !== "none") {
          // A gradient definition is about 250 bytes; a redefinition replaces one already counted.
          if (!gradients.has(name)) {
            if (gradients.size >= MAX_GRADIENTS || bytes + GRADIENT_BYTES > MAX_BYTES) break;
            bytes += GRADIENT_BYTES;
          }
          gradients.set(name, {
            id: `g${gradientCount++}`,
            from,
            to,
            angle: clamp(a[3], -3600, 3600),
          });
        }
        break;
      }
      case "card.animate": {
        const kind = str(a[0]);
        if (MOTIONS.includes(kind)) motion = kind as Motion;
        scanColor = typeof pen.fill === "string" ? null : pen.fill;
        break;
      }
      case "card.fill": {
        const paint = paintOf(str(a[0]));
        if (paint) pen.fill = paint;
        break;
      }
      case "card.stroke": {
        const paint = solid(str(a[0]));
        if (paint) pen.strokeColor = paint;
        pen.strokeWidth = clamp(a[1], 0, 40);
        break;
      }
      case "card.font":
        pen.size = clamp(a[0], 6, 96);
        pen.weight = WEIGHTS[str(a[1])] ?? 400;
        pen.mono = a[2] === true;
        break;
      case "card.align":
        pen.anchor = ANCHORS[str(a[0])] ?? "start";
        break;
      case "card.opacity":
        pen.opacity = clamp(a[0], 0, 100) / 100;
        break;
      case "card.rect": {
        const w = length(a[2]);
        const h = length(a[3]);
        const r = Math.min(clamp(a[4], 0, 600), w / 2, h / 2);
        push(
          `<rect x="${px(a[0])}" y="${py(a[1])}" width="${w}" height="${h}"${r > 0 ? ` rx="${r}"` : ""} ${fillAttrs()} ${strokeAttrs()}/>`,
        );
        break;
      }
      case "card.circle":
        push(
          `<circle cx="${px(a[0])}" cy="${py(a[1])}" r="${clamp(a[2], 0, Math.max(width, height))}" ${fillAttrs()} ${strokeAttrs()}/>`,
        );
        break;
      case "card.line": {
        // A line is stroked; with no stroke set it falls back to a 1px line in the fill colour.
        const stroked = strokeAttrs();
        const style = stroked || `${attr("stroke", pen.fill, pen.opacity)} stroke-width="1"`;
        push(
          `<line x1="${px(a[0])}" y1="${py(a[1])}" x2="${px(a[2])}" y2="${py(a[3])}" ${style} stroke-linecap="round"/>`,
        );
        break;
      }
      case "card.text": {
        const content = Array.from(str(a[2]).replace(/[\r\n\t]+/g, " "))
          .slice(0, MAX_TEXT)
          .join("");
        push(
          `<text x="${px(a[0])}" y="${py(a[1])}" ${fillAttrs()} ${strokeAttrs()} font-family="${pen.mono ? MONO : SANS}" font-size="${pen.size}" font-weight="${pen.weight}" text-anchor="${pen.anchor}">${esc(content)}</text>`,
        );
        break;
      }
      case "card.icon": {
        const d = ICONS[str(a[0])];
        if (!d) break;
        const size = clamp(a[3], 4, 256);
        push(
          `<path transform="translate(${px(a[1])} ${py(a[2])}) scale(${fmt(size / 16)})" d="${d}" ${attr("stroke", pen.fill, pen.opacity)} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
        );
        break;
      }
      case "card.avatar": {
        if (avatars >= MAX_AVATARS) break;
        avatars++;
        const x = px(a[0]);
        const y = py(a[1]);
        const size = clamp(a[2], 8, 512);
        const round = a[3] === true;
        const shape = round
          ? `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"`
          : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size / 8)}"`;
        const avatarUrl = user.avatar;
        if (!avatarOk(avatarUrl)) {
          // No image: a quiet placeholder with the same footprint.
          push(`${shape} fill="#8b949e" fill-opacity="0.25"/>`);
          break;
        }
        const id = `c${clipCount++}`;
        if (!pushDef(`<clipPath id="${id}">${shape}/></clipPath>`)) break;
        push(
          `<image href="${avatarUrl}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"${pen.opacity < 1 ? ` opacity="${fmt(pen.opacity)}"` : ""}/>`,
        );
        break;
      }
      case "card.languages": {
        const x = px(a[0]);
        const y = py(a[1]);
        const w = length(a[2]);
        const h = Math.max(1, length(a[3]));
        const langs = user.languages.slice(0, 8);
        const total = langs.reduce(
          (s, l) => s + (Number.isFinite(l.share) ? Math.max(0, l.share) : 0),
          0,
        );
        if (w < 2 || total <= 0) break;
        const id = `c${clipCount++}`;
        const clipped = pushDef(
          `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${fmt(Math.min(h / 2, w / 2))}"/></clipPath>`,
        );
        if (!clipped) break;
        // Whole-pixel boundaries, each segment starting where the last ended.
        let cursor = x;
        let covered = 0;
        const bars: string[] = [];
        for (const l of langs) {
          covered += Math.max(0, Number.isFinite(l.share) ? l.share : 0) / total;
          const end = Math.round(x + Math.min(1, covered) * w);
          const seg = Math.max(0, end - cursor);
          if (seg === 0) continue;
          const paint = solid(l.color) ?? solid("#8b949e");
          bars.push(
            `<rect x="${cursor}" y="${y}" width="${seg}" height="${h}" ${attr("fill", paint ?? "#8b949e", pen.opacity)}/>`,
          );
          cursor += seg;
        }
        push(`<g clip-path="url(#${id})" shape-rendering="crispEdges">${bars.join("")}</g>`);
        break;
      }
      case "card.heatmap": {
        const x = px(a[0]);
        const y = py(a[1]);
        const cell = clamp(a[2], 2, 24);
        const gap = clamp(a[3], 0, 10);
        const weeks = clamp(a[4], 1, 53);
        const days = user.days
          .slice(-weeks * 7)
          .map((d) => (Number.isFinite(d) ? Math.max(0, d) : 0));
        if (days.length === 0) break;
        const max = Math.max(...days, 1);
        const baseAlpha = typeof pen.fill === "string" ? 1 : pen.fill.alpha;
        const r = Math.min(2, cell / 4);
        const cells: string[] = [];
        days.forEach((count, i) => {
          const cx = x + Math.floor(i / 7) * (cell + gap);
          const cy = y + (i % 7) * (cell + gap);
          // Four levels above empty, by share of the busiest day.
          const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
          const alpha = ([0.1, 0.35, 0.55, 0.78, 1][level] ?? 0.1) * baseAlpha;
          cells.push(
            `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="${r}" fill-opacity="${fmt(alpha * pen.opacity)}"/>`,
          );
        });
        // One group carries the colour; the cells carry only their level.
        const base = typeof pen.fill === "string" ? pen.fill : pen.fill.value;
        push(`<g fill="${base}">${cells.join("")}</g>`);
        break;
      }
      case "card.sparkline": {
        const x = px(a[0]);
        const y = py(a[1]);
        const w = length(a[2]);
        const h = length(a[3]);
        const values = (Array.isArray(a[4]) ? a[4] : [])
          .slice(0, 400)
          .map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0));
        if (values.length < 2 || w === 0) break;
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const span = hi - lo;
        const points = values
          .map((v, i) => {
            const vx = x + (i / (values.length - 1)) * w;
            const vy = span === 0 ? y + h / 2 : y + h - ((v - lo) / span) * h;
            return `${fmt(vx)},${fmt(vy)}`;
          })
          .join(" ");
        const stroked = strokeAttrs();
        const style = stroked || `${attr("stroke", pen.fill, pen.opacity)} stroke-width="2"`;
        push(
          `<polyline points="${points}" fill="none" ${style} stroke-linecap="round" stroke-linejoin="round"/>`,
        );
        break;
      }
      default:
        break; // unknown functions are ignored
    }
  }

  // ── Compose ──────────────────────────────────────────────────────────────
  const radius = bg?.radius ?? 0;
  const cardRadius = Math.min(radius, width / 2, height / 2);
  const animated = motion === "Fade" || motion === "Rise" || motion === "Pulse";
  const drawn = animated
    ? body.map((el, i) => `<g class="cd-a" style="--i:${Math.min(i, 30)}">${el}</g>`).join("")
    : body.join("");

  const gradientDefs = [...gradients.values()]
    .map((g) => {
      const rad = (g.angle * Math.PI) / 180; // CSS convention: 0 points up, 90 right
      const dx = Math.sin(rad) / 2;
      const dy = -Math.cos(rad) / 2;
      const stop = (offset: number, p: Paint) =>
        `<stop offset="${offset}" stop-color="${p.value}"${p.alpha < 1 ? ` stop-opacity="${fmt(p.alpha)}"` : ""}/>`;
      return `<linearGradient id="${g.id}" x1="${fmt(0.5 - dx)}" y1="${fmt(0.5 - dy)}" x2="${fmt(0.5 + dx)}" y2="${fmt(0.5 + dy)}">${stop(0, g.from)}${stop(1, g.to)}</linearGradient>`;
    })
    .join("");

  const css: string[] = [];
  if (animated) {
    css.push(
      ".cd-a{animation-duration:.7s;animation-timing-function:ease-out;animation-fill-mode:backwards;animation-delay:calc(var(--i)*60ms)}",
    );
    if (motion === "Fade")
      css.push(".cd-a{animation-name:cd-fade}@keyframes cd-fade{from{opacity:0}to{opacity:1}}");
    if (motion === "Rise")
      css.push(
        ".cd-a{animation-name:cd-rise}@keyframes cd-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
      );
    if (motion === "Pulse")
      css.push(
        ".cd-a{animation-name:cd-pulse;animation-duration:2.4s;animation-iteration-count:infinite;animation-fill-mode:none;animation-delay:calc(var(--i)*120ms);animation-timing-function:ease-in-out}@keyframes cd-pulse{0%,100%{opacity:1}50%{opacity:.45}}",
      );
  }
  if (motion === "Scan") {
    css.push(
      `.cd-scan{animation:cd-scan 3.2s linear infinite}@keyframes cd-scan{from{transform:translateY(-4px)}to{transform:translateY(${height + 4}px)}}`,
    );
  }
  if (motion !== "None") {
    css.push(
      "@media (prefers-reduced-motion:reduce){.cd-a,.cd-scan{animation:none}.cd-scan{display:none}}",
    );
  }

  const scan =
    motion === "Scan"
      ? `<rect class="cd-scan" x="0" y="0" width="${width}" height="2" ${attr("fill", scanColor ?? "#8b949e", 0.5)}/>`
      : "";

  const title = options.title ?? `GitHub card for ${user.name || user.login}`;
  const frame = (paint: Paint | string) =>
    `<rect width="${width}" height="${height}"${cardRadius > 0 ? ` rx="${cardRadius}"` : ""} ${attr("fill", paint)}/>`;
  const outline =
    border && border.width > 0 && border.paint.value !== "none"
      ? `<rect x="${border.width / 2}" y="${border.width / 2}" width="${width - border.width}" height="${height - border.width}" rx="${Math.max(0, cardRadius - border.width / 2)}" fill="none" ${attr("stroke", border.paint)} stroke-width="${border.width}"/>`
      : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cd-title">`,
    `<title id="cd-title">${esc(title)}</title>`,
    css.length ? `<style>${css.join("")}</style>` : "",
    `<defs><clipPath id="cd-card"><rect width="${width}" height="${height}"${cardRadius > 0 ? ` rx="${cardRadius}"` : ""}/></clipPath>${gradientDefs}${defs.join("")}</defs>`,
    `<g clip-path="url(#cd-card)">`,
    bg ? frame(bg.paint) : "",
    drawn,
    scan,
    outline,
    "</g>",
    "</svg>",
  ].join("");
}
