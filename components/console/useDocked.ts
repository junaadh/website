"use client";

import { useSyncExternalStore } from "react";

// Desktop: the console docks beside the page instead of covering it.
const QUERY = "(min-width: 1024px)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

export function useDocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
