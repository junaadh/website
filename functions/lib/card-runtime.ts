// The Eitri wasm inside the Worker. Pages bundles the import as a precompiled
// WebAssembly.Module (Workers cannot compile wasm from bytes at runtime), and
// it is instantiated once per isolate.

import type { CardRuntime } from "../../lib/card/types";
import { loadCard } from "../../lib/eitri/eitri";
import wasm from "../../public/eitri/eitri.wasm";

let loading: Promise<CardRuntime> | null = null;

export function cardRuntime(): Promise<CardRuntime> {
  if (!loading) {
    loading = loadCard(wasm)
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
