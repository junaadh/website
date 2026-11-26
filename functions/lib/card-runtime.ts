// The Eitri wasm inside the Worker. Pages bundles the import as a precompiled
// WebAssembly.Module (Workers cannot compile wasm from bytes at runtime), and
// it is instantiated once per isolate.

import type { CardRuntime } from "../../lib/card/types";
import { loadCard } from "../../lib/eitri/eitri";
import wasm from "../../public/eitri/eitri.wasm";

let loading: Promise<CardRuntime> | null = null;

export function cardRuntime(): Promise<CardRuntime> {
  if (!loading) {
    loading = loadCard(wasm).catch((err) => {
      loading = null; // allow a retry
      throw err;
    });
  }
  return loading;
}
