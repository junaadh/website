import { useState } from "react";
import { tokenNames } from "../../shared/config";
import type { Flags, Palette, Profile, SiteConfig } from "../../shared/config";
import { Button, Field, Notice, Panel, Toggle } from "./ui";
import {
  EducationEditor,
  ExperienceEditor,
  ProjectEditor,
  SkillEditor,
} from "./sections";

const flagCopy: Record<keyof Flags, [string, string]> = {
  marquee: ["Tech ticker", "Scrolls the stack list under the hero."],
  sectionNav: ["Section rail", "Dot navigation on the right, desktop only."],
  commandPalette: ["Command palette", "⌘K, and the hint chip in the masthead."],
  byteInspector: ["Byte inspector", "The interactive hero panel."],
};

const sectionNames: Record<string, string> = {
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  social: "Social and SEO",
};

/** Turns `profile.projects[7].name` into `Projects · item 8 · name`, so a
    validation failure points at a card rather than an array index. */
function humanise(path: string) {
  const [location, ...rest] = path.split(": ");
  const parts = location
    .replace(/^profile\.?/, "")
    .replace(/^palette\b/, "Theme")
    .split(".")
    .filter(Boolean)
    .flatMap((part) => {
      const match = part.match(/^([a-zA-Z]+)\[(\d+)\]$/);
      if (!match) return [sectionNames[part] ?? part];
      return [sectionNames[match[1]] ?? match[1], `item ${Number(match[2]) + 1}`];
    });
  return `${parts.join(" · ") || "Basics"} — ${rest.join(": ")}`;
}

export default function Editor({
  initial,
  version,
  onPublish,
  onRevert,
  onRebuildCv,
  onInvalidateStats,
  busy,
  error,
  notice,
}: {
  initial: SiteConfig;
  version: number;
  onPublish: (config: SiteConfig) => void;
  onRevert: () => void;
  onRebuildCv: () => void;
  onInvalidateStats: () => void;
  busy: boolean;
  error?: { message: string; errors?: string[] };
  notice?: string;
}) {
  const [profile, setProfile] = useState<Profile>(initial.profile);
  const [palette, setPalette] = useState<Palette>(initial.palette);
  const [flags, setFlags] = useState<Flags>(initial.flags);

  const field = (key: keyof Profile, label: string, multiline = false) => (
    <Field
      label={label}
      multiline={multiline}
      value={String(profile[key] ?? "")}
      onChange={(value) => setProfile({ ...profile, [key]: value })}
    />
  );

  const social = (key: keyof Profile["social"], label: string) => (
    <Field
      label={label}
      value={String(profile.social[key] ?? "")}
      onChange={(value) =>
        setProfile({ ...profile, social: { ...profile.social, [key]: value } })
      }
    />
  );

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <Notice kind="error">
          <strong>{error.message}</strong>
          {error.errors && (
            <ul className="mt-2 flex flex-col gap-1 font-mono text-[12px]">
              {error.errors.map((line) => (
                <li key={line}>{humanise(line)}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      {notice && <Notice kind="ok">{notice}</Notice>}

      <Panel title="Basics">
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {field("name", "Name")}
          {field("commonName", "Common name")}
          {field("fullName", "Full name (CV)")}
          {field("title", "Title")}
          {field("location", "Location")}
          {field("email", "Email")}
          {field("phone", "Phone")}
          {field("handle", "Handle")}
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {field("summary", "Summary (CV)", true)}
          {field("about", "About (site)", true)}
        </div>
      </Panel>

      <Panel title="Social and SEO" hint="Drives the title, meta description and JSON-LD.">
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {social("title", "Page title")}
          {social("label", "Label")}
          <Field
            label="Headline line 1"
            value={profile.social.headline[0] ?? ""}
            onChange={(value) =>
              setProfile({
                ...profile,
                social: {
                  ...profile.social,
                  headline: [value, profile.social.headline[1] ?? ""],
                },
              })
            }
          />
          <Field
            label="Headline line 2"
            value={profile.social.headline[1] ?? ""}
            onChange={(value) =>
              setProfile({
                ...profile,
                social: {
                  ...profile.social,
                  headline: [profile.social.headline[0] ?? "", value],
                },
              })
            }
          />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {social("description", "Meta description")}
          {social("imageAlt", "Social image alt")}
        </div>
      </Panel>

      <Panel title="Theme" hint="Hex only. Applied at the edge as a CSS variable override.">
        <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
          {(["dark", "light"] as const).map((theme) => (
            <div key={theme}>
              <h3 className="mb-3 font-mono text-[11px] tracking-[1px] text-secondary uppercase">
                {theme}
              </h3>
              <div className="flex flex-col gap-2">
                {tokenNames.map((token) => (
                  <label key={token} className="flex items-center gap-3">
                    <input
                      type="color"
                      // A colour input cannot express 8-digit hex, so the text
                      // field beside it stays authoritative.
                      value={palette[theme][token].slice(0, 7)}
                      onChange={(event) =>
                        setPalette({
                          ...palette,
                          [theme]: {
                            ...palette[theme],
                            [token]: event.target.value,
                          },
                        })
                      }
                      className="size-7 shrink-0 cursor-pointer border border-visual-line bg-transparent"
                      aria-label={`${theme} ${token}`}
                    />
                    <span className="w-[104px] shrink-0 font-mono text-[11px] text-muted">
                      {token}
                    </span>
                    <input
                      value={palette[theme][token]}
                      onChange={(event) =>
                        setPalette({
                          ...palette,
                          [theme]: {
                            ...palette[theme],
                            [token]: event.target.value,
                          },
                        })
                      }
                      spellCheck={false}
                      className="w-full border border-visual-line bg-visual-bg px-2 py-1 font-mono text-[12px] text-fg outline-none focus:border-strong-line"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Features">
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {(Object.keys(flagCopy) as (keyof Flags)[]).map((key) => (
            <Toggle
              key={key}
              label={flagCopy[key][0]}
              hint={flagCopy[key][1]}
              checked={flags[key]}
              onChange={(value) => setFlags({ ...flags, [key]: value })}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Experience" hint="Newest first. One role may be marked current.">
        <ExperienceEditor
          items={profile.experience}
          onChange={(experience) => setProfile({ ...profile, experience })}
        />
      </Panel>

      <Panel title="Projects" hint="Order here is the order on the site.">
        <ProjectEditor
          items={profile.projects}
          onChange={(projects) => setProfile({ ...profile, projects })}
        />
      </Panel>

      <Panel title="Skills">
        <SkillEditor
          items={profile.skills}
          onChange={(skills) => setProfile({ ...profile, skills })}
        />
      </Panel>

      <Panel title="Education" hint="The first entry is the one shown in full.">
        <EducationEditor
          items={profile.education}
          onChange={(education) => setProfile({ ...profile, education })}
        />
      </Panel>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 border border-line bg-surface/95 px-5 py-4 backdrop-blur">
        <span className="font-mono text-[12px] text-muted">
          {version > 0 ? `published v${version}` : "nothing published yet"}
        </span>
        <div className="flex gap-3">
          <Button onClick={onRebuildCv} disabled={busy}>
            Rebuild CV
          </Button>
          <Button onClick={onInvalidateStats} disabled={busy}>
            Refresh GitHub card
          </Button>
          <Button onClick={onRevert} disabled={busy || version < 2} variant="danger">
            Revert
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => onPublish({ profile, palette, flags })}
          >
            {busy ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
