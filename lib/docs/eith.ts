// A small parser for the subset of Eitri declaration files (.eith) the SDK
// uses, so the reference pages are generated from the files the console
// itself serves and cannot drift from them. No imports: node loads this
// directly (scripts/check-docs.mjs), and the pages use it at build time.
//
// What it understands:
//  - the file's leading comment block, if a blank line follows it (the intro);
//  - `pub enum`, `pub struct` (fields with trailing or leading comments),
//    `pub let` and `pub fn`, where a function is either a bare signature or
//    one written in Eitri with a body (only its signature is kept);
//  - comment blocks directly above a declaration (its description) and a
//    short one-line comment above a bare signature, after a blank line, which
//    names a group ("// The canvas.") for the functions that follow;
//  - a comment block set apart by blank lines on both sides is also a group.
// Anything else is an error, so an unsupported construct fails the build.

export interface EithParam {
  name: string;
  type: string;
}

export interface EithFn {
  name: string;
  params: EithParam[];
  returns: string;
  /** `fn name(a: T) -> R`, as written. */
  signature: string;
  doc: string[];
  group: string;
  /** Written in Eitri (it has a body) rather than provided by the host. */
  helper: boolean;
}

export interface EithField {
  name: string;
  type: string;
  doc: string[];
}

export interface EithStruct {
  name: string;
  doc: string[];
  fields: EithField[];
}

export interface EithEnum {
  name: string;
  doc: string[];
  cases: string[];
}

export interface EithValue {
  name: string;
  type: string;
  doc: string[];
  group: string;
}

export interface EithModule {
  /** The import path, such as "site/theme". */
  path: string;
  /** The name the module is imported as: its last path segment. */
  alias: string;
  intro: string[];
  functions: EithFn[];
  structs: EithStruct[];
  enums: EithEnum[];
  values: EithValue[];
}

export interface DocBlock {
  kind: "p" | "pre";
  text: string;
}

/** Comment lines to paragraphs; lines indented by two spaces or more stay literal. */
export function docBlocks(lines: string[]): DocBlock[] {
  const blocks: DocBlock[] = [];
  let current: DocBlock | null = null;
  for (const line of lines) {
    if (line.trim() === "") {
      current = null;
    } else if (/^ {2,}/.test(line)) {
      if (current?.kind === "pre") {
        current.text += `\n${line.slice(2)}`;
      } else {
        current = { kind: "pre", text: line.slice(2) };
        blocks.push(current);
      }
    } else if (current?.kind === "p") {
      current.text += ` ${line.trim()}`;
    } else {
      current = { kind: "p", text: line.trim() };
      blocks.push(current);
    }
  }
  return blocks;
}

/** A description as one line of text. */
export const docText = (lines: string[]): string =>
  lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ");

const uncomment = (line: string): string => line.trim().replace(/^\/\/ ?/, "");

/** Splits a line into code and its trailing `//` comment (not inside a string). */
function splitComment(line: string): [code: string, comment: string] {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "/" && line[i + 1] === "/") {
      return [line.slice(0, i).trimEnd(), line.slice(i + 2).trim()];
    }
  }
  return [line.trimEnd(), ""];
}

/** Net change in brace depth over a line, ignoring strings and comments. */
function braceDelta(line: string): number {
  const [code] = splitComment(line);
  let depth = 0;
  let inString = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return depth;
}

/** Splits at top-level commas (not inside brackets or parentheses). */
function splitParams(text: string): EithParam[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const at = p.indexOf(":");
      if (at === -1) throw new Error(`parameter "${p}" has no type`);
      return { name: p.slice(0, at).trim(), type: p.slice(at + 1).trim() };
    });
}

const GROUP_MAX = 40;

export function parseEith(path: string, text: string): EithModule {
  const lines = text.split(/\r?\n/);
  const fail = (at: number, why: string): never => {
    throw new Error(`${path}.eith:${at + 1}: ${why}`);
  };
  const mod: EithModule = {
    path,
    alias: path.split("/").pop() ?? path,
    intro: [],
    functions: [],
    structs: [],
    enums: [],
    values: [],
  };

  let i = 0;
  // The intro: the leading comment block, when a blank line follows it.
  {
    let end = 0;
    while (end < lines.length && (lines[end] ?? "").trim().startsWith("//")) end++;
    if (end > 0 && (lines[end] ?? "").trim() === "") {
      mod.intro = lines.slice(0, end).map(uncomment);
      i = end;
    }
  }

  let comment: string[] = [];
  let commentAfterBlank = true;
  let lastBlank = true;
  let group = "";

  // The body of a struct or enum: lines up to the closing brace.
  const block = (from: number): { body: { text: string; before: string[] }[]; next: number } => {
    const body: { text: string; before: string[] }[] = [];
    let pending: string[] = [];
    let at = from + 1;
    for (; at < lines.length; at++) {
      const t = (lines[at] ?? "").trim();
      if (t === "}") return { body, next: at + 1 };
      if (t === "") {
        pending = [];
      } else if (t.startsWith("//")) {
        pending.push(uncomment(t));
      } else {
        body.push({ text: t, before: pending });
        pending = [];
      }
    }
    return fail(from, "declaration is never closed");
  };

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const t = raw.trim();
    if (t === "") {
      if (comment.length > 0) {
        group = comment.join(" ").replace(/\.$/, "");
        comment = [];
      }
      lastBlank = true;
      i++;
      continue;
    }
    if (t.startsWith("//")) {
      if (comment.length === 0) commentAfterBlank = lastBlank;
      comment.push(uncomment(t));
      lastBlank = false;
      i++;
      continue;
    }
    lastBlank = false;
    let doc = comment;
    const labelled = commentAfterBlank;
    comment = [];

    const [code, trailing] = splitComment(t);
    const head = /^(pub\s+)?(enum|struct|let|fn)\s+(\w+)/.exec(code);
    if (!head) return fail(i, `cannot parse "${t}"`);
    const isPub = Boolean(head[1]);
    const kind = head[2];
    const name = head[3] ?? "";

    if (kind === "enum" || kind === "struct") {
      if (!code.endsWith("{")) fail(i, `${kind} ${name}: expected "{" at the end of the line`);
      const { body, next } = block(i);
      if (isPub) {
        if (kind === "enum") {
          const cases = body.map((b) => {
            const m = /^(\w+)/.exec(b.text);
            return m ? (m[1] ?? "") : fail(i, `enum ${name}: cannot parse case "${b.text}"`);
          });
          mod.enums.push({ name, doc, cases });
        } else {
          const fields = body.map((b) => {
            const [fieldCode, fieldComment] = splitComment(b.text);
            const m = /^(?:pub\s+)?(\w+)\s*:\s*(.+)$/.exec(fieldCode);
            if (!m) return fail(i, `struct ${name}: cannot parse field "${b.text}"`);
            return {
              name: m[1] ?? "",
              type: (m[2] ?? "").trim(),
              doc: fieldComment ? [fieldComment] : b.before,
            };
          });
          mod.structs.push({ name, doc, fields });
        }
      }
      i = next;
      continue;
    }

    if (kind === "let") {
      const m = /^pub\s+let\s+(\w+)\s*:\s*(.+)$/.exec(code);
      if (!m) return fail(i, `cannot parse "${t}" (only "pub let name: type" is supported)`);
      if (doc.length === 1 && labelled && (doc[0] ?? "").length < GROUP_MAX) {
        group = (doc[0] ?? "").replace(/\.$/, "");
        doc = [];
      }
      mod.values.push({
        name,
        type: (m[2] ?? "").trim(),
        doc: trailing ? [trailing] : doc,
        group,
      });
      i++;
      continue;
    }

    // fn
    const open = code.indexOf("(");
    let depth = 0;
    let close = -1;
    for (let k = open; k < code.length; k++) {
      if (code[k] === "(") depth++;
      else if (code[k] === ")" && --depth === 0) {
        close = k;
        break;
      }
    }
    if (open === -1 || close === -1) return fail(i, `cannot parse the parameters of "${t}"`);
    const rest = code.slice(close + 1).trim();
    const hasBody = rest.endsWith("{");
    const returns = rest.replace(/\{$/, "").replace(/^->/, "").trim();
    let next = i + 1;
    if (hasBody) {
      let level = braceDelta(raw);
      while (level > 0 && next < lines.length) level += braceDelta(lines[next++] ?? "");
    }
    if (isPub) {
      const params = splitParams(code.slice(open + 1, close));
      const bare = !hasBody;
      if (bare && doc.length === 1 && labelled && (doc[0] ?? "").length < GROUP_MAX) {
        group = (doc[0] ?? "").replace(/\.$/, "");
        doc = [];
      }
      mod.functions.push({
        name,
        params,
        returns: returns || "void",
        signature: `fn ${name}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")})${returns ? ` -> ${returns}` : ""}`,
        doc: trailing ? [trailing] : doc,
        group,
        helper: hasBody,
      });
    }
    i = next;
  }
  return mod;
}
