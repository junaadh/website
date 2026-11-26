// Tree-sitter syntax highlighting for Eitri, loaded on demand (the console
// pulls this module in, the first paint never does).
//
// Capture names are Helix-style ("keyword.control.return", "type.builtin"...)
// and fall back from specific to generic. Every name maps to a tk-* class
// defined in app/globals.css in the HUD palette.

import type { Language, Query, Tree } from "web-tree-sitter";

export interface Run {
  /** Offset of the run in the highlighted text (a stable key). */
  at: number;
  text: string;
  /** tk-* class, "" for plain text. */
  cls: string;
}

const CLASSES: Record<string, string> = {
  keyword: "tk-kw",
  "keyword.control": "tk-ctl",
  "keyword.control.import": "tk-kw",
  "keyword.function": "tk-kw",
  "keyword.storage": "tk-kw",
  "keyword.storage.type": "tk-kw",
  "keyword.storage.modifier": "tk-kw",
  function: "tk-fn",
  "function.method": "tk-fn",
  type: "tk-ty",
  "type.builtin": "tk-tyb",
  "type.parameter": "tk-ty",
  "type.enum.variant": "tk-variant",
  constructor: "tk-ctor",
  variable: "",
  "variable.builtin": "tk-ctor",
  "variable.parameter": "tk-param",
  "variable.other.member": "tk-member",
  constant: "tk-const",
  "constant.builtin": "tk-const",
  "constant.numeric": "tk-num",
  "constant.character": "tk-str",
  "constant.character.escape": "tk-esc",
  string: "tk-str",
  "string.special": "tk-esc",
  "string.special.path": "tk-str",
  comment: "tk-cm",
  operator: "tk-op",
  punctuation: "tk-punct",
  "punctuation.special": "tk-esc",
  attribute: "tk-attr",
  namespace: "tk-ns",
  label: "tk-label",
};

/** "keyword.control.return" -> the most specific class known for it. */
export function classFor(capture: string): string {
  let name = capture;
  while (name) {
    const cls = CLASSES[name];
    if (cls !== undefined) return cls;
    const dot = name.lastIndexOf(".");
    name = dot === -1 ? "" : name.slice(0, dot);
  }
  return "";
}

const classCache = new Map<string, string>();
function cachedClass(name: string): string {
  let cls = classCache.get(name);
  if (cls === undefined) {
    cls = classFor(name);
    classCache.set(name, cls);
  }
  return cls;
}

interface Point {
  row: number;
  column: number;
}

function pointAt(text: string, index: number): Point {
  let row = 0;
  let last = -1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) {
    row++;
    last = i;
  }
  return { row, column: index - last - 1 };
}

export interface HighlightDoc {
  /** Highlight the new text, re-parsing incrementally from the previous tree. */
  update(text: string): Run[];
  dispose(): void;
}

export interface Highlighter {
  doc(): HighlightDoc;
}

let loading: Promise<Highlighter> | null = null;

/** Fetches the runtime, grammar and queries once; later calls share them. */
export function loadHighlighter(): Promise<Highlighter> {
  if (!loading) {
    loading = (async () => {
      const { Parser, Language, Query, Edit } = await import("web-tree-sitter");
      await Parser.init({ locateFile: (name: string) => `/eitri/${name}` });
      const [language, source] = await Promise.all([
        Language.load("/eitri/tree-sitter-eitri.wasm"),
        fetch("/eitri/highlights.scm").then((r) => {
          if (!r.ok) throw new Error(`highlights.scm: ${r.status}`);
          return r.text();
        }),
      ]);
      const query = new Query(language, source);
      return makeHighlighter(Parser, language, query, Edit);
    })().catch((err) => {
      loading = null; // allow a retry
      throw err;
    });
  }
  return loading;
}

type ParserCtor = typeof import("web-tree-sitter").Parser;
type EditCtor = typeof import("web-tree-sitter").Edit;

export function makeHighlighter(
  Parser: ParserCtor,
  language: Language,
  query: Query,
  EditClass: EditCtor,
): Highlighter {
  return {
    doc() {
      const parser = new Parser();
      parser.setLanguage(language);
      let tree: Tree | null = null;
      let prev = "";

      return {
        update(text) {
          if (tree) {
            // One edit: the span between the common prefix and suffix.
            let start = 0;
            const min = Math.min(prev.length, text.length);
            while (start < min && prev[start] === text[start]) start++;
            let oldEnd = prev.length;
            let newEnd = text.length;
            while (oldEnd > start && newEnd > start && prev[oldEnd - 1] === text[newEnd - 1]) {
              oldEnd--;
              newEnd--;
            }
            if (start !== oldEnd || start !== newEnd) {
              tree.edit(
                new EditClass({
                  startIndex: start,
                  oldEndIndex: oldEnd,
                  newEndIndex: newEnd,
                  startPosition: pointAt(prev, start),
                  oldEndPosition: pointAt(prev, oldEnd),
                  newEndPosition: pointAt(text, newEnd),
                }),
              );
            }
          }
          const next = parser.parse(text, tree);
          tree?.delete();
          tree = next;
          prev = text;
          return next ? paint(text, next, query) : [{ at: 0, text, cls: "" }];
        },
        dispose() {
          tree?.delete();
          tree = null;
          parser.delete();
        },
      };
    },
  };
}

/**
 * One class per character. Later patterns win over earlier ones, and a
 * smaller span wins over the span that contains it, so a string's escape
 * sequences and interpolations keep their own colour inside it.
 */
function paint(text: string, tree: Tree, query: Query): Run[] {
  const caps = query.captures(tree.rootNode);
  const order = caps
    .map((c, i) => ({
      start: c.node.startIndex,
      end: c.node.endIndex,
      cls: cachedClass(c.name),
      pattern: c.patternIndex ?? i,
      i,
    }))
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.pattern - b.pattern || a.i - b.i);

  const names = [""];
  const index = new Map<string, number>([["", 0]]);
  const cells = new Uint16Array(text.length);
  for (const c of order) {
    let id = index.get(c.cls);
    if (id === undefined) {
      id = names.length;
      names.push(c.cls);
      index.set(c.cls, id);
    }
    cells.fill(id, c.start, Math.min(c.end, text.length));
  }

  const runs: Run[] = [];
  let from = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || cells[i] !== cells[from]) {
      runs.push({ at: from, text: text.slice(from, i), cls: names[cells[from] ?? 0] ?? "" });
      from = i;
    }
  }
  return runs;
}
