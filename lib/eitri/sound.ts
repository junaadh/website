// Small synthesised sounds. Silent until the visitor has interacted with the
// page (browsers require a gesture) and under prefers-reduced-motion.

let ctx: AudioContext | null = null;
let gestured = false;
const recent: number[] = [];

/** Call from real user input (pointerdown, keydown). */
export function markGesture(): void {
  gestured = true;
}

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function context(): AudioContext | null {
  if (!gestured && !navigator.userActivation?.hasBeenActive) return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const VOLUME = 0.05;

function tone(c: AudioContext, hz: number, ms: number, type: OscillatorType, gain: number) {
  const t0 = c.currentTime;
  const end = t0 + ms / 1000;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = hz;
  // Short envelope: 6 ms attack, exponential release, so there is no click.
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(end + 0.02);
}

// At most 20 sounds a second, whatever a script does.
function allowed(): boolean {
  const now = performance.now();
  while (recent.length && now - (recent[0] ?? 0) > 1000) recent.shift();
  if (recent.length >= 20) return false;
  recent.push(now);
  return true;
}

export function beep(hz: number, ms: number, muted: boolean): void {
  if (muted || reduced() || !allowed()) return;
  const c = context();
  if (c) tone(c, hz, ms, "square", VOLUME);
}

export function chord(notes: number[], ms: number, muted: boolean): void {
  if (muted || reduced() || notes.length === 0 || !allowed()) return;
  const c = context();
  if (c) for (const hz of notes) tone(c, hz, ms, "triangle", VOLUME / Math.sqrt(notes.length));
}
