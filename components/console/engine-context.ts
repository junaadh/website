"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { Engine, EngineState } from "@/lib/eitri/engine";

export const EngineContext = createContext<Engine | null>(null);

export function useEngine(): Engine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("useEngine must be used inside <SiteProvider>");
  return engine;
}

/** Subscribe to one slice of engine state. select must return a stable reference. */
export function useEngineState<T>(select: (s: EngineState) => T): T {
  const engine = useEngine();
  return useSyncExternalStore(
    engine.subscribe,
    () => select(engine.getState()),
    () => select(engine.getState()),
  );
}

export const useLook = () => useEngineState((s) => s.look);
export const useContent = () => useEngineState((s) => s.content);
