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
