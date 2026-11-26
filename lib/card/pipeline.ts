// Script + data -> SVG, shared by the playground and the API.

import { renderError } from "./error";
import { renderCard } from "./render";
import type { CardRuntime, CardUser, RunResult } from "./types";

export interface Rendered {
  svg: string;
  result: RunResult;
  /** True when the SVG is the user's card rather than a diagnostic. */
  ok: boolean;
}

export const OUTCOME_LABEL: Record<RunResult["outcome"], string> = {
  ok: "ok",
  compile: "compile error",
  fault: "runtime fault",
  error: "host error",
  stale: "stale",
};

export function renderScript(
  runtime: CardRuntime,
  source: string,
  user: CardUser,
  params: Record<string, string>,
): Rendered {
  const result = runtime.render(source, user, params);
  if (result.outcome === "ok") return { svg: renderCard(result.effects, user), result, ok: true };
  const svg = renderError(result.report, `eitri // ${OUTCOME_LABEL[result.outcome]}`);
  return { svg, result, ok: false };
}
