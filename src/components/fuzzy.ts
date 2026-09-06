export type Match = { score: number; positions: number[] };

const boundary = /[\s\-/_.,—·(:]/;

/**
 * fzf-style subsequence match: every character of `needle` must appear in
 * `haystack` in order, but not necessarily adjacently. Scoring rewards runs of
 * consecutive hits and hits that start a word, and penalises the gaps skipped
 * between them, so "sw" ranks "Selected work" above "Software".
 */
export function fuzzy(needle: string, haystack: string): Match | null {
  if (!needle) return { score: 0, positions: [] };
  const lower = haystack.toLowerCase();
  const positions: number[] = [];
  let score = 0;
  let from = 0;
  let streak = 0;
  for (const character of needle) {
    const at = lower.indexOf(character, from);
    if (at === -1) return null;
    if (at === from && positions.length) {
      streak += 1;
      score += 10 + streak * 5;
    } else {
      streak = 0;
      score -= Math.min(at - from, 16) * 0.5;
    }
    if (at === 0 || boundary.test(haystack[at - 1])) score += 14;
    positions.push(at);
    from = at + 1;
  }
  // Nudge shorter labels ahead when the match is otherwise equal.
  return { score: score - haystack.length * 0.06, positions };
}

/** Collapses matched indices into runs, so highlighting needs few elements. */
export function segments(text: string, positions: number[]) {
  const marked = new Set(positions);
  const runs: { text: string; on: boolean }[] = [];
  for (let index = 0; index < text.length; index++) {
    const on = marked.has(index);
    const last = runs[runs.length - 1];
    if (last && last.on === on) last.text += text[index];
    else runs.push({ text: text[index], on });
  }
  return runs;
}
