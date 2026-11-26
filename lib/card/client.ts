// The card runtime in the browser: the wasm is fetched on first use only.

import { type CardRuntime, loadCard } from "../eitri/eitri";

let loading: Promise<CardRuntime> | null = null;

export function getCardRuntime(): Promise<CardRuntime> {
  if (!loading) {
    loading = loadCard("/eitri/eitri.wasm").catch((err) => {
      loading = null; // allow a retry
      throw err;
    });
  }
  return loading;
}
