// Small fuzzy matcher for the command palette: every query character must
// appear in order. Consecutive runs and word starts score higher.

/** Higher is better; null when the query does not match. */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase();
  if (q === "") return 0;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    const at = t.indexOf(ch, ti);
    if (at === -1) return null;
    const wordStart = at === 0 || /[\s._/-]/.test(t[at - 1] ?? "");
    streak = at === ti ? streak + 1 : 0;
    score += 1 + streak * 2 + (wordStart ? 4 : 0) - Math.min(3, at - ti) * 0.5;
    ti = at + 1;
  }
  if (t.startsWith(q)) score += 10;
  else if (t.includes(q)) score += 5;
  return score - t.length * 0.02;
}

/** Best score over several fields, the first one weighted up. */
export function bestScore(query: string, fields: readonly string[]): number | null {
  let best: number | null = null;
  fields.forEach((f, i) => {
    const s = fuzzyScore(query, f);
    if (s === null) return;
    const weighted = s + (i === 0 ? 3 : 0);
    if (best === null || weighted > best) best = weighted;
  });
  return best;
}
