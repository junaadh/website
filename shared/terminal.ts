import type { Profile } from "./config";

/* Truecolor escapes matching the site's palette, so the shell output and the
   page are recognisably the same thing. */
export const esc = (code: string) => `\x1b[${code}m`;
export const reset = esc("0");
export const accent = esc("38;2;197;246;106");
export const fg = esc("38;2;231;233;225");
export const muted = esc("38;2;152;158;145");
export const faint = esc("38;2;154;167;139");
export const bold = esc("1");

export const paint = (colour: string, text: string) => `${colour}${text}${reset}`;

/** Wraps to a column without breaking words, for the summary paragraphs. */
export function wrap(text: string, width: number, indent = "") {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(indent + line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(indent + line);
  return lines.join("\n");
}

export const rule = (width: number) => paint(faint, "─".repeat(width));

export const heading = (text: string) =>
  `\n${paint(accent, "▌")} ${paint(bold + fg, text.toUpperCase())}\n`;

/** The whole résumé as ANSI text, for `curl junaadh.dev`. */
export function terminalResume(p: Profile, width = 76) {
  const out: string[] = [];

  out.push("");
  out.push(`  ${paint(bold + fg, p.fullName)}  ${paint(faint, "·")}  ${paint(accent, p.title)}`);
  out.push(`  ${paint(muted, `${p.location}  ·  ${p.email}  ·  ${p.website}`)}`);
  out.push("");
  out.push(`  ${rule(width - 4)}`);
  out.push("");
  out.push(wrap(p.summary, width - 4, "  "));

  out.push(heading("Experience"));
  for (const job of p.experience) {
    const marker = job.current ? paint(accent, " ●") : "";
    out.push(
      `  ${paint(bold + fg, job.company)} ${paint(faint, "—")} ${paint(muted, job.role)}${marker}`,
    );
    out.push(`  ${paint(faint, `${job.period}  ·  ${job.location}`)}`);
    for (const bullet of job.bullets)
      out.push(wrap(bullet, width - 8, "    ").replace(/^ {4}/, `    ${paint(accent, "·")} `));
    out.push("");
  }

  out.push(heading("Projects"));
  for (const project of p.projects.filter((item) => item.cv)) {
    out.push(`  ${paint(bold + fg, project.name)}  ${paint(faint, project.url)}`);
    for (const bullet of project.bullets)
      out.push(wrap(bullet, width - 8, "    ").replace(/^ {4}/, `    ${paint(accent, "·")} `));
    out.push("");
  }

  out.push(heading("Toolkit"));
  for (const skill of p.skills)
    out.push(
      `  ${paint(fg, skill.name.padEnd(16))}${paint(muted, skill.items.join(", "))}`,
    );

  out.push(heading("Education"));
  for (const entry of p.education) {
    out.push(`  ${paint(fg, entry.institution)}  ${paint(faint, entry.period)}`);
    out.push(`  ${paint(muted, entry.qualification)}`);
  }

  out.push("");
  out.push(`  ${rule(width - 4)}`);
  out.push(
    `  ${paint(muted, "PDF")}  ${paint(fg, `${p.website}/cv.pdf`)}   ${paint(muted, "code")}  ${paint(fg, p.github)}`,
  );
  out.push(`  ${paint(faint, "you are reading this in a terminal. nice.")}`);
  out.push("");
  return out.join("\n");
}

/** A one-liner for `curl junaadh.dev/whoami`. */
export const whoami = (p: Profile) =>
  `${p.commonName} · ${p.title} · ${p.location} · ${p.website}\n`;
