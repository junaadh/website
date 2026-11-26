// The card pipeline's shared types. Pure TypeScript: this runs in the browser
// and in a Cloudflare Worker, so nothing here may touch the DOM.

export type {
  CardLanguage,
  CardRepo,
  CardRuntime,
  CardUser,
  Effect,
  RunResult,
  Value,
} from "../eitri/eitri";
