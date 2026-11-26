// biome-ignore-all lint/a11y/noSvgWithoutTitle: the SVGs are decoration inside an image that is rendered to a PNG
// Open Graph images, drawn at build time with next/og. app/og/[file]/route.tsx
// calls card() for each one: the HUD look of the site (dark void, grid, a chamfered
// frame with bracketed corners) in the default accent.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/lib/profile";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_TYPE = "image/png";

// oklch(0.86 0.15 195) and the site's neutrals, as sRGB.
const SIGNAL = "#00efef";
const VOID = "#03060b";
const INK = "#ebf4f4";
const INK_2 = "#b0c2c2";
const INK_3 = "#6c8686";

const fonts = async () => {
  const dir = join(process.cwd(), "assets", "fonts");
  const [regular, semibold] = await Promise.all([
    readFile(join(dir, "IBMPlexSans-Regular.ttf")),
    readFile(join(dir, "IBMPlexSans-SemiBold.ttf")),
  ]);
  return [
    { name: "Plex", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Plex", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
};

export interface OgCard {
  /** Small label above the title, e.g. "P-01 // Scripting language". */
  kicker: string;
  title: string;
  subtitle: string;
  tags?: string[];
  /** Bottom line, e.g. the URL. */
  footer: string;
}

const host = new URL(profile.links.website).host;
export const hostOf = (path = "") => `${host}${path}`;

const MARK = "M8 22V14l6-6h8M42 8h14v14M56 42v8l-6 6H42M22 56H8V42";

export async function card(c: OgCard): Promise<ImageResponse> {
  const { width: W, height: H } = OG_SIZE;
  const inset = 28;
  const cut = 44;
  const frame = [
    `${inset + cut},${inset}`,
    `${W - inset},${inset}`,
    `${W - inset},${H - inset - cut}`,
    `${W - inset - cut},${H - inset}`,
    `${inset},${H - inset}`,
    `${inset},${inset + cut}`,
  ].join(" ");
  const b = 56; // bracket arm
  const o = inset + 14;
  const brackets = [
    `M${o} ${o + b}V${o + cut - 14}l${cut - 14} -${cut - 14}H${o + b + 14}`,
    `M${W - o - b} ${o}H${W - o}V${o + b}`,
    `M${W - o} ${H - o - b}V${H - o - cut + 14}l-${cut - 14} ${cut - 14}H${W - o - b - 14}`,
    `M${o + b} ${H - o}H${o}V${H - o - b}`,
  ].join("");
  const titleSize = c.title.length > 18 ? 84 : c.title.length > 12 ? 104 : 124;

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        position: "relative",
        background: VOID,
        backgroundImage:
          "radial-gradient(ellipse 70% 80% at 18% 8%, rgba(0,200,220,0.20), rgba(0,0,0,0) 70%), linear-gradient(rgba(0,239,239,0.07) 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(0,239,239,0.07) 1px, rgba(0,0,0,0) 1px)",
        backgroundSize: "100% 100%, 56px 56px, 56px 56px",
        fontFamily: "Plex",
        color: INK,
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon points={frame} fill="none" stroke={SIGNAL} strokeOpacity="0.3" strokeWidth="2" />
        <path d={brackets} fill="none" stroke={SIGNAL} strokeWidth="5" />
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "88px 96px 84px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: SIGNAL,
          }}
        >
          {c.kicker}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1,
              color: INK,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 920,
              fontSize: 38,
              lineHeight: 1.3,
              color: INK_2,
            }}
          >
            {c.subtitle}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {c.tags && c.tags.length > 0 && (
              <div style={{ display: "flex", marginBottom: 26 }}>
                {c.tags.slice(0, 5).map((t) => (
                  <div
                    key={t}
                    style={{
                      display: "flex",
                      marginRight: 14,
                      padding: "8px 18px",
                      fontSize: 24,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: INK_2,
                      border: "2px solid rgba(0,239,239,0.35)",
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 28, letterSpacing: 3, color: INK_3 }}>
              {c.footer}
            </div>
          </div>
          <svg width="96" height="96" viewBox="0 0 64 64" style={{ display: "flex" }}>
            <path d={MARK} fill="none" stroke={SIGNAL} strokeWidth="4" />
            <path
              d="M23 20h18M34 20v20a10 10 0 0 1-10 10h-1"
              fill="none"
              stroke={SIGNAL}
              strokeWidth="6"
            />
          </svg>
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}
