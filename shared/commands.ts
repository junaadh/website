import type { Profile } from "./config";
import { codepoints, toCells } from "./bytes";
import { accent, bold, faint, fg, heading, muted, paint, rule, wrap } from "./terminal";

/**
 * The command layer, kept pure and isomorphic on purpose: it takes a profile
 * and a line, and returns ANSI plus any effect the host should perform. The
 * browser overlay drives it today; an SSH server could drive the same module
 * without a fork.
 */
export type CommandResult = {
  output?: string;
  clear?: boolean;
  open?: string;
  theme?: "auto" | "light" | "dark";
  exit?: boolean;
};

const width = 72;

const commands: [string, string][] = [
  ["help", "this list"],
  ["whoami", "one-line summary"],
  ["about", "the longer version"],
  ["work", "selected projects"],
  ["open <n>", "open project n in a new tab"],
  ["experience", "where I've worked"],
  ["skills", "the toolkit"],
  ["education", "schooling"],
  ["contact", "how to reach me"],
  ["bytes <text>", "UTF-8 breakdown"],
  ["cv", "the full résumé"],
  ["theme <mode>", "auto, light or dark"],
  ["clear", "wipe the scrollback"],
  ["exit", "close this pane"],
];

const list = (rows: [string, string][]) =>
  rows
    .map(([name, description]) => `  ${paint(accent, name.padEnd(16))}${paint(muted, description)}`)
    .join("\n");

const bullets = (items: string[]) =>
  items
    .map((item) => wrap(item, width - 6, "    ").replace(/^ {4}/, `    ${paint(accent, "·")} `))
    .join("\n");

export function runCommand(line: string, p: Profile): CommandResult {
  const [name, ...args] = line.trim().split(/\s+/);
  const command = name.toLowerCase();
  if (!command) return {};

  switch (command) {
    case "help":
    case "?":
      return {
        output: `${heading("Commands")}${list(commands)}\n\n  ${paint(faint, "Tab completes. ↑ and ↓ walk history. Esc closes.")}\n`,
      };

    case "whoami":
      return {
        output: `  ${paint(bold + fg, p.fullName)} ${paint(faint, "·")} ${paint(accent, p.title)}\n  ${paint(muted, `${p.location} · ${p.website}`)}\n`,
      };

    case "about":
      return { output: `\n${wrap(p.about, width, "  ")}\n` };

    case "work":
    case "projects":
      return {
        output:
          heading("Projects") +
          p.projects
            .map(
              (project, index) =>
                `  ${paint(accent, String(index + 1).padStart(2))}  ${paint(bold + fg, project.name)}  ${paint(faint, project.category)}\n${wrap(project.description, width - 6, "      ")}`,
            )
            .join("\n\n") +
          `\n\n  ${paint(faint, `open <1-${p.projects.length}> to visit one`)}\n`,
      };

    case "open": {
      const index = Number(args[0]);
      const project =
        p.projects[index - 1] ??
        p.projects.find((item) =>
          item.name.toLowerCase().startsWith((args[0] ?? "").toLowerCase()),
        );
      if (!project)
        return { output: `  ${paint(accent, "?")} no such project. try ${paint(fg, "work")}\n` };
      return {
        open: project.url,
        output: `  opening ${paint(accent, project.name)} ${paint(faint, project.url)}\n`,
      };
    }

    case "experience":
    case "jobs":
      return {
        output:
          heading("Experience") +
          p.experience
            .map(
              (job) =>
                `  ${paint(bold + fg, job.company)} ${paint(faint, "—")} ${paint(muted, job.role)}${job.current ? paint(accent, " ●") : ""}\n  ${paint(faint, `${job.period} · ${job.location}`)}\n${bullets(job.bullets)}`,
            )
            .join("\n\n") + "\n",
      };

    case "skills":
    case "toolkit":
      return {
        output:
          heading("Toolkit") +
          p.skills
            .map((skill) => `  ${paint(fg, skill.name.padEnd(16))}${paint(muted, skill.items.join(", "))}`)
            .join("\n") + "\n",
      };

    case "education":
      return {
        output:
          heading("Education") +
          p.education
            .map(
              (entry) =>
                `  ${paint(fg, entry.institution)}  ${paint(faint, entry.period)}\n  ${paint(muted, entry.qualification)}`,
            )
            .join("\n\n") + "\n",
      };

    case "contact":
      return {
        output:
          heading("Contact") +
          list([
            ["email", p.email],
            ["github", p.github],
            ["x", `https://x.com/${p.handle}`],
          ]) + "\n",
      };

    case "bytes":
    case "utf8": {
      const subject = args.join(" ");
      if (!subject)
        return { output: `  usage: ${paint(fg, "bytes")} ${paint(accent, "<text>")}\n` };
      const cells = toCells(subject);
      const runs = codepoints(cells);
      return {
        output:
          `\n  ${paint(fg, JSON.stringify(subject))} ${paint(muted, `— ${cells.length} bytes, ${runs.length} characters`)}\n\n` +
          runs
            .map(
              (entry) =>
                `  ${paint(fg, entry.char)} ${paint(faint, entry.codepoint.padEnd(8))} ${paint(accent, entry.bytes.join(" "))}`,
            )
            .join("\n") + "\n",
      };
    }

    case "theme": {
      const mode = (args[0] ?? "").toLowerCase();
      if (mode !== "auto" && mode !== "light" && mode !== "dark")
        return { output: `  usage: ${paint(fg, "theme")} ${paint(accent, "auto|light|dark")}\n` };
      return { theme: mode, output: `  theme → ${paint(accent, mode)}\n` };
    }

    case "clear":
    case "cls":
      return { clear: true };

    case "exit":
    case "quit":
    case "q":
      return { exit: true };

    // Worth the two lines.
    case "sudo":
      return { output: `  ${paint(muted, `${p.commonName} is not in the sudoers file. This incident will be reported.`)}\n` };
    case "ls":
      return { output: `  ${paint(muted, commands.map(([c]) => c.split(" ")[0]).join("  "))}\n` };

    default:
      return {
        output: `  ${paint(accent, command)}: not found. try ${paint(fg, "help")}\n`,
      };
  }
}

/** Names only, for tab completion. */
export const commandNames = commands.map(([name]) => name.split(" ")[0]);

export const banner = (p: Profile) =>
  `\n  ${paint(bold + fg, p.fullName)} ${paint(faint, "·")} ${paint(accent, p.title)}\n  ${rule(width - 4)}\n  ${paint(muted, "type")} ${paint(fg, "help")} ${paint(muted, "to begin, or")} ${paint(fg, "cv")} ${paint(muted, "for everything at once")}\n`;
