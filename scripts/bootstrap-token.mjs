/**
 * Mints the short-lived JWT that /api/auth/bootstrap accepts.
 *
 *   node scripts/bootstrap-token.mjs              # print the curl
 *   node scripts/bootstrap-token.mjs --run        # do the handshake, show a QR
 *   node scripts/bootstrap-token.mjs --run --url=https://junaadh.dev
 *
 * The secret comes from BOOTSTRAP_JWT_SECRET, falling back to .dev.vars for
 * local use. In production set it with
 *   bunx wrangler pages secret put BOOTSTRAP_JWT_SECRET --project-name=website
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";

const arg = (name, fallback) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1] ??
  fallback;

/** Falls back to .dev.vars so a local demo needs no exported env. */
function secretFromDevVars() {
  try {
    return readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
      .match(/^\s*BOOTSTRAP_JWT_SECRET\s*=\s*"?([^"\n]+)"?/m)?.[1]
      ?.trim();
  } catch {
    return undefined;
  }
}

const secret = process.env.BOOTSTRAP_JWT_SECRET || secretFromDevVars();
if (!secret) {
  console.error(
    "No BOOTSTRAP_JWT_SECRET. Export it, or put it in .dev.vars for local use.",
  );
  process.exit(1);
}

// The verifier refuses anything longer-lived than an hour, signed or not.
const ttl = Math.min(Number(arg("ttl", 300)), 3600);
const url = arg("url", "http://localhost:8788").replace(/\/$/, "");

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
  jti: randomUUID(),
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + ttl,
  sub: "bootstrap",
})}`;
const token = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;

if (!process.argv.includes("--run")) {
  console.log(`# single use, valid ${ttl}s, against ${url}\n`);
  console.log(`curl -sX POST ${url}/api/auth/bootstrap \\`);
  console.log(`  -H "authorization: Bearer ${token}" | jq\n`);
  console.log("# or re-run with --run to do the handshake and print a QR code");
  process.exit(0);
}

const response = await fetch(`${url}/api/auth/bootstrap`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
});
const result = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`\n  ${response.status} — ${result.error ?? response.statusText}\n`);
  process.exit(1);
}

console.log("\n  Scan with your authenticator app:\n");
console.log(await QRCode.toString(result.totp.uri, { type: "terminal", small: true }));
console.log(`  secret    ${result.totp.secret}`);
console.log(`  password  ${result.password}`);
console.log(`  expires   in ${result.expiresIn}s\n`);
console.log(`  Now open ${url}/admin, paste the password and a code from the app,`);
console.log("  and register your passkey.\n");
