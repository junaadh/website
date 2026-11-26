"use client";

// Glass over the whole page: CRT curvature and vignette, phosphor flicker.
// Both sit above the content but below the console, and never take the pointer.
export function ScreenOverlays({ crt, flicker }: { crt: boolean; flicker: boolean }) {
  return (
    <>
      {crt && <div aria-hidden="true" className="fx-crt" />}
      {flicker && <div aria-hidden="true" className="fx-flicker" />}
    </>
  );
}
