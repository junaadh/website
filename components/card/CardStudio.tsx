"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Duration } from "@/components/console/Duration";
import { ScriptEditor } from "@/components/console/ScriptEditor";
import { getCardRuntime } from "@/lib/card/client";
import { OUTCOME_LABEL, renderScript } from "@/lib/card/pipeline";
import { DEFAULT_PRESET, PRESETS, presetById } from "@/lib/card/presets";
import { SAMPLE_USER } from "@/lib/card/sample";
import { decodeScript, encodeScript } from "@/lib/card/share";
import type { CardUser, RunResult } from "@/lib/card/types";
import { profile } from "@/lib/profile";
import { EmbedPanel } from "./EmbedPanel";
import { type ParamRow, ParamsEditor } from "./ParamsEditor";

const SITE = profile.links.website;
const DEFAULT_LOGIN = "junaadh";
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const SCRIPT_KEY = "card.script";
const LOGIN_KEY = "card.user";
const CUSTOM = "custom";

const field = "control";

type Data =
  | { kind: "loading" }
  | { kind: "live"; user: CardUser; source: string }
  | { kind: "sample"; reason: string };

function isCardUser(x: unknown): x is CardUser {
  if (typeof x !== "object" || x === null) return false;
  const u = x as Record<string, unknown>;
  return (
    typeof u.login === "string" &&
    typeof u.name === "string" &&
    typeof u.avatar === "string" &&
    Array.isArray(u.days) &&
    Array.isArray(u.languages) &&
    Array.isArray(u.top)
  );
}

interface Shown {
  svg: string;
  ok: boolean;
  outcome: RunResult["outcome"];
  report: string;
  micros: number;
}

const safe = <T,>(f: () => T, fallback: T): T => {
  try {
    return f();
  } catch {
    return fallback;
  }
};

function CardImage({ src }: { src: string }) {
  return (
    // oxlint-disable-next-line nextjs/no-img-element
    <img src={src} alt="Rendered GitHub card" className="h-auto max-w-full" />
  );
}

export function CardStudio() {
  const id = useId();
  const [login, setLogin] = useState(DEFAULT_LOGIN);
  const [presetId, setPresetId] = useState(DEFAULT_PRESET);
  const [script, setScript] = useState(() => presetById(DEFAULT_PRESET)?.source ?? "");
  const [rows, setRows] = useState<ParamRow[]>([{ id: 1, key: "theme", value: "dark" }]);
  const [fetched, setFetched] = useState<{ name: string; data: Data } | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [packed, setPacked] = useState<{ script: string; value: string | null } | null>(null);
  const [ready, setReady] = useState(false);
  // A link (?s=, ?u=, ?preset=) never overwrites what is saved: only the visitor's own edits persist.
  const [edited, setEdited] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Start from the URL (?u=&preset=&s=&<params>) or from what was saved.
  /* oxlint-disable react/set-state-in-effect -- browser-only state, read once after hydration */
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const fromUrl = q.get("u");
    const savedLogin = safe(() => localStorage.getItem(LOGIN_KEY), null);
    setLogin(fromUrl ?? savedLogin ?? DEFAULT_LOGIN);
    const extra = [...q].filter(([k]) => k !== "u" && k !== "preset" && k !== "s").slice(0, 16);
    if (extra.length) setRows(extra.map(([key, value], i) => ({ id: i + 1, key, value })));
    (async () => {
      const shared = q.get("s");
      const decoded = shared ? await decodeScript(shared) : null;
      const preset = presetById(q.get("preset") ?? "");
      const saved = safe(() => localStorage.getItem(SCRIPT_KEY), null);
      if (decoded !== null) {
        setScript(decoded);
        setPresetId(CUSTOM);
      } else if (preset) {
        setScript(preset.source);
        setPresetId(preset.id);
      } else if (saved) {
        setScript(saved);
        setPresetId(PRESETS.find((p) => p.source === saved)?.id ?? CUSTOM);
      }
      setReady(true);
    })();
  }, []);

  /* oxlint-enable react/set-state-in-effect */

  useEffect(() => {
    if (!ready || !edited) return;
    safe(() => localStorage.setItem(SCRIPT_KEY, script), undefined);
    safe(() => localStorage.setItem(LOGIN_KEY, login), undefined);
  }, [ready, edited, script, login]);

  // The user's data: once per username (debounced), from the API.
  const name = login.trim();
  const valid = LOGIN.test(name);
  useEffect(() => {
    if (!ready || !valid) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const done = (data: Data) => setFetched({ name, data });
      try {
        const res = await fetch(`/api/card/${encodeURIComponent(name)}.json`, {
          signal: ctrl.signal,
        });
        const body: unknown = await res.json().catch(() => null);
        if (res.ok && isCardUser(body)) {
          done({ kind: "live", user: body, source: res.headers.get("x-card-source") ?? "" });
        } else if (typeof body === "object" && body !== null && "error" in body) {
          done({
            kind: "sample",
            reason: `${String((body as { error: unknown }).error)} Showing the sample profile.`,
          });
        } else {
          done({
            kind: "sample",
            reason:
              "The /api/card endpoint is not available here (static dev). Showing the sample profile. Run bun run dev:api for the real thing.",
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        done({ kind: "sample", reason: "Could not reach /api/card. Showing the sample profile." });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [ready, valid, name]);

  const data: Data = !valid
    ? {
        kind: "sample",
        reason: "That is not a valid GitHub username, so the sample profile is drawn.",
      }
    : fetched?.name === name
      ? fetched.data
      : { kind: "loading" };

  const user = data.kind === "live" ? data.user : data.kind === "sample" ? SAMPLE_USER : null;
  const params = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of rows) if (r.key.trim() && !(r.key.trim() in out)) out[r.key.trim()] = r.value;
    return out;
  }, [rows]);

  // The card: rendered here with the browser wasm, on every edit (debounced).
  useEffect(() => {
    if (!user || !ready) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const runtime = await getCardRuntime();
        if (!live) return;
        const { svg, ok, result } = renderScript(runtime, script, user, params);
        setRuntimeError(null);
        setShown({
          svg,
          ok,
          outcome: result.outcome,
          report: result.report,
          micros: result.micros,
        });
      } catch (err) {
        if (live) setRuntimeError(String(err));
      }
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [user, ready, script, params]);

  // The script as a URL parameter, when it is not just a preset.
  const isPreset = presetById(presetId)?.source === script;
  useEffect(() => {
    if (isPreset) return;
    let live = true;
    const timer = setTimeout(() => {
      encodeScript(script).then((value) => live && setPacked({ script, value }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [isPreset, script]);
  const encoded = packed?.script === script ? packed.value : undefined;

  // Short links: save the script once (POST /api/card/scripts) and embed
  // ?script=<id> instead of carrying the whole script in the URL.
  const [short, setShort] = useState<{ script: string; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [shortError, setShortError] = useState<string | null>(null);
  const shortId = short?.script === script ? short.id : null;
  const shorten = useCallback(async () => {
    setSaving(true);
    setShortError(null);
    try {
      const res = await fetch("/api/card/scripts", {
        method: "POST",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: script,
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (res.ok && body.id) setShort({ script, id: body.id });
      else if (res.status === 404 || res.status === 501)
        setShortError("Short links are not available here, so the long link carries the script.");
      else setShortError(body.error ?? `Could not save the script (${res.status}).`);
    } catch {
      setShortError("Short links are not available here, so the long link carries the script.");
    } finally {
      setSaving(false);
    }
  }, [script]);

  const embed = useMemo(() => {
    if (!valid) return { url: null, note: "Enter a valid GitHub username." };
    const q = new URLSearchParams();
    if (isPreset) q.set("preset", presetId);
    else if (shortId) q.set("script", shortId);
    else if (encoded === undefined) return { url: null, note: null };
    else if (encoded === null) {
      return {
        url: null,
        note: "This script is too long to carry in a URL (6 KB). Download the SVG instead.",
      };
    } else q.set("s", encoded);
    for (const [k, v] of Object.entries(params)) if (!q.has(k)) q.set(k, v);
    return { url: `${SITE}/api/card/${name}.svg?${q}`, note: null };
  }, [valid, name, isPreset, presetId, shortId, encoded, params]);

  const dataUrl = useMemo(
    () => (shown ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shown.svg)}` : null),
    [shown],
  );

  return (
    <div className="grid gap-6 @4xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid gap-4 @xl:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-user`} className="label">
              GitHub username
            </label>
            <input
              id={`${id}-user`}
              value={login}
              onChange={(e) => {
                setEdited(true);
                setLogin(e.target.value);
              }}
              maxLength={39}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-preset`} className="label">
              Preset
            </label>
            <select
              id={`${id}-preset`}
              value={isPreset ? presetId : CUSTOM}
              onChange={(e) => {
                const p = presetById(e.target.value);
                if (!p) return;
                setEdited(true);
                setScript(p.source);
                setPresetId(p.id);
              }}
              className={field}
            >
              {!isPreset && <option value={CUSTOM}>Custom script</option>}
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label">Eitri script · import card from "card"</span>
          <ScriptEditor
            value={script}
            onChange={(text) => {
              setEdited(true);
              setScript(text);
              setPresetId(presetById(presetId)?.source === text ? presetId : CUSTOM);
            }}
            label="Card script"
            className="h-[26rem]"
          />
        </div>

        <ParamsEditor rows={rows} onChange={setRows} />
      </div>

      <div className="flex min-w-0 flex-col gap-5 @4xl:sticky @4xl:top-20 @4xl:self-start">
        <div className="hud p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="label text-signal">{"PREVIEW // LIVE"}</h3>
            {shown && (
              <span
                className="label font-mono tabular-nums"
                title="time to compile and run the script"
              >
                <Duration micros={shown.micros} />
              </span>
            )}
            {shown && (
              <span className={`label ${shown.ok ? "text-ok" : "text-err"}`}>
                {OUTCOME_LABEL[shown.outcome]}
              </span>
            )}
          </div>
          <div className="grid min-h-[14rem] place-items-center overflow-auto border border-line bg-void/60 p-4">
            {dataUrl ? (
              <CardImage src={dataUrl} />
            ) : (
              <p className="label">{runtimeError ?? "Rendering…"}</p>
            )}
          </div>
          {runtimeError && <p className="mt-3 font-mono text-xs text-err">{runtimeError}</p>}
          {data.kind === "sample" && <p className="mt-3 text-xs text-warn">{data.reason}</p>}
          {data.kind === "live" && data.source === "rest" && (
            <p className="mt-3 text-xs text-warn">
              Basic profile only: the server has no GitHub token, so contributions and the heatmap
              are empty.
            </p>
          )}
          {data.kind === "loading" && <p className="label mt-3">Loading profile…</p>}
        </div>

        <EmbedPanel
          url={embed.url}
          note={shortError ?? embed.note}
          svg={shown?.svg ?? ""}
          login={login.trim()}
          long={!isPreset && !shortId}
          saving={saving}
          onShorten={shorten}
        />
      </div>
    </div>
  );
}
