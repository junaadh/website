/**
 * Prints the current TOTP code for a base32 secret, so the flow can be
 * demonstrated without reaching for a phone.
 *
 *   node scripts/totp.mjs <base32-secret> [--watch]
 *
 * For real use, scan the otpauth:// URI from the bootstrap response into an
 * authenticator app instead — the secret should not live in your shell history.
 */
import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(value) {
  const clean = value.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes = [];
  let bits = 0;
  let buffer = 0;
  for (const character of clean) {
    const index = BASE32.indexOf(character);
    if (index === -1) throw new Error(`not base32: ${character}`);
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** RFC 6238: SHA-1, 6 digits, 30s step. */
function code(secret, step = Math.floor(Date.now() / 30000)) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

const secret = process.argv[2];
if (!secret) {
  console.error("Usage: node scripts/totp.mjs <base32-secret> [--watch]");
  process.exit(1);
}

const show = () => {
  const left = 30 - Math.floor((Date.now() / 1000) % 30);
  process.stdout.write(`\r${code(secret)}  (${String(left).padStart(2)}s left) `);
};

if (process.argv.includes("--watch")) {
  show();
  setInterval(show, 1000);
} else {
  console.log(code(secret));
}
