/**
 * Clipboard access needs a secure context and a user gesture, and is refused
 * outright by some browsers. Callers show the text either way, so a failure
 * only means the confirmation is withheld.
 */
export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies text that is not known until a request finishes.
 *
 * Safari grants clipboard access only for the duration of the user gesture, and
 * `await fetch(...)` before `writeText` spends it — the write then throws
 * NotAllowedError. Handing `ClipboardItem` a *promise* keeps the gesture alive
 * while the request is in flight, which is the only way this works in Safari.
 * Browsers without that form fall back to awaiting and writing directly, which
 * they permit.
 *
 * Must be called synchronously from the event handler; awaiting anything first
 * defeats the point.
 */
export async function copyDeferred(value: Promise<string>) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": value.then(
            (text) => new Blob([text], { type: "text/plain" }),
          ),
        }),
      ]);
      return true;
    }
  } catch {
    // Fall through: the promise is still pending or settled, and reusable.
  }
  return copyText(await value);
}
