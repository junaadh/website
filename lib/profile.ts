import raw from "@/content/profile.json";
import type { ProjectData } from "@/lib/eitri/eitri";

export type Status = "active" | "shipped" | "experiment" | "archived";
export type YearMonth = `${number}-${number}`;

export interface Project {
  slug: string;
  name: string;
  kind: string;
  year: number;
  status: Status;
  featured: boolean;
  cv: boolean;
  summary: string;
  description: string;
  stack: string[];
  links: { repo?: string; live?: string; writeup?: string };
  highlights?: string[];
  demo?: "eitri-inspector";
  specimen?: { internals?: string; broke?: string; learned?: string };
}

export interface Role {
  company: string;
  role: string;
  start: YearMonth;
  end: YearMonth | null;
  location: string;
  stack: string[];
  highlights: string[];
}

export interface Profile {
  person: {
    name: string;
    fullName: string;
    handle: string;
    title: string;
    location: string;
    languages: string[];
    intro: string;
    about: string;
  };
  links: { email: string; github: string; cv: string };
  meta: { title: string; description: string };
  projects: Project[];
  experience: Role[];
  education: {
    institution: string;
    qualification: string;
    start: YearMonth;
    end: YearMonth;
    location: string;
    details: string;
  }[];
  skills: { name: string; items: string[] }[];
  customize: { defaultScript: string };
}

export const profile = raw as unknown as Profile;

// JSON imports are only loosely typed, so check what the site relies on.
// Runs at build time: a bad entry fails `next build` instead of shipping.
const STATUSES: readonly string[] = ["active", "shipped", "experiment", "archived"];
const seen = new Set<string>();
for (const p of profile.projects) {
  if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`project slug "${p.slug}" must be kebab-case`);
  if (seen.has(p.slug)) throw new Error(`duplicate project slug "${p.slug}"`);
  if (!STATUSES.includes(p.status)) throw new Error(`${p.slug}: unknown status "${p.status}"`);
  seen.add(p.slug);
}

export const projects = profile.projects;

/** What the Eitri console sees of each project (no prose, no links). */
export const projectData: ProjectData[] = projects.map((p) => ({
  slug: p.slug,
  name: p.name,
  kind: p.kind,
  year: p.year,
  status: p.status,
  featured: p.featured,
  stack: p.stack,
}));
export const bySlug = (slug: string) => projects.find((p) => p.slug === slug);

/** "P-01", "P-02"… in profile.json order. */
export const code = (p: Project) => `P-${String(projects.indexOf(p) + 1).padStart(2, "0")}`;

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fmt = (ym: YearMonth) => monthYear.format(new Date(`${ym}-01T00:00:00Z`));
export const period = (start: YearMonth, end: YearMonth | null) =>
  `${fmt(start)} — ${end ? fmt(end) : "Now"}`;
