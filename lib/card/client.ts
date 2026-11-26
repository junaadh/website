// The card runtime in the browser: the wasm is fetched on first use only.

import { type CardRuntime, loadCard } from "../eitri/eitri";

let loading: Promise<CardRuntime> | null = null;

export function getCardRuntime(): Promise<CardRuntime> {
  if (!loading) {
    loading = loadCard("/eitri/eitri.wasm")
      .then(guarded)
      .catch((err) => {
        loading = null; // allow a retry
        throw err;
      });
  }
  return loading;
}

/** A trap leaves the wasm instance in an unknown state: drop it so the next call starts fresh. */
function guarded(runtime: CardRuntime): CardRuntime {
  return {
    ...runtime,
    render(...args) {
      try {
        return runtime.render(...args);
      } catch (err) {
        loading = null;
        throw err;
      }
    },
    inspect(...args) {
      try {
        return runtime.inspect(...args);
      } catch (err) {
        loading = null;
        throw err;
      }
    },
  };
}
