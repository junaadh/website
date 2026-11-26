// A card script <-> one URL parameter. Compressed with deflate-raw when the
// platform has CompressionStream ("z" prefix), else plain base64url ("p").
// Pure TypeScript: runs in the browser and in a Worker.

/** Longest encoded script a URL may carry. */
export const MAX_ENCODED = 6144;
/** Longest script after decoding. A guard against compression bombs. */
export const MAX_SCRIPT = 24_576;

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const fromBase64Url = (text: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
    const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

const hasStreams = () =>
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  limit: number,
) {
  const writer = stream.writable.getWriter();
  const done = writer.write(bytes as unknown as BufferSource).then(() => writer.close());
  done.catch(() => {}); // a rejected read below reports the failure
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Encode a script for a URL, or null if it would be longer than MAX_ENCODED. */
export async function encodeScript(script: string): Promise<string | null> {
  const raw = new TextEncoder().encode(script);
  if (raw.length > MAX_SCRIPT) return null;
  let encoded = `p${toBase64Url(raw)}`;
  if (hasStreams()) {
    try {
      const packed = await pipe(raw, new CompressionStream("deflate-raw"), MAX_SCRIPT * 2);
      const z = `z${toBase64Url(packed)}`;
      if (z.length < encoded.length) encoded = z;
    } catch {
      // keep the plain form
    }
  }
  return encoded.length <= MAX_ENCODED ? encoded : null;
}

/** Decode what encodeScript made; null for anything malformed or oversized. */
export async function decodeScript(param: string): Promise<string | null> {
  if (param.length < 1 || param.length > MAX_ENCODED) return null;
  const bytes = fromBase64Url(param.slice(1));
  if (!bytes) return null;
  try {
    let raw = bytes;
    if (param[0] === "z") {
      if (!hasStreams()) return null;
      raw = await pipe(bytes, new DecompressionStream("deflate-raw"), MAX_SCRIPT);
    } else if (param[0] !== "p") return null;
    if (raw.length > MAX_SCRIPT) return null;
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(raw);
  } catch {
    return null;
  }
}
