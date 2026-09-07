import test from "node:test";
import assert from "node:assert/strict";
import {
  base32Decode,
  base32Encode,
  equal,
  totp,
  totpMatches,
  verifyJwt,
} from "../functions/lib/crypto.ts";

/* The Worker crypto helpers use only Web Crypto, btoa/atob and TextEncoder,
   all of which Node provides globally — so they can be tested as-is. */

// RFC 6238 Appendix B, SHA-1 rows. The RFC prints 8 digits; we emit 6.
const RFC_SECRET = base32Encode(
  new TextEncoder().encode("12345678901234567890"),
);

test("TOTP matches the RFC 6238 test vectors", async () => {
  const vectors: [number, string][] = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ];
  for (const [seconds, expected] of vectors) {
    const code = await totp(RFC_SECRET, Math.floor(seconds / 30));
    assert.equal(code, expected, `T=${seconds}`);
  }
});

test("base32 round-trips arbitrary bytes", () => {
  for (let length = 1; length <= 24; length++) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    assert.deepEqual(base32Decode(base32Encode(bytes)), bytes, `${length} bytes`);
  }
});

test("TOTP accepts the neighbouring window but not a distant one", async () => {
  const step = Math.floor(Date.now() / 30000);
  assert.equal(await totpMatches(RFC_SECRET, await totp(RFC_SECRET, step)), true);
  assert.equal(
    await totpMatches(RFC_SECRET, await totp(RFC_SECRET, step - 1)),
    true,
    "one step back should still pass",
  );
  assert.equal(
    await totpMatches(RFC_SECRET, await totp(RFC_SECRET, step - 5)),
    false,
    "five steps back must fail",
  );
  for (const junk of ["", "abcdef", "12345", "1234567"])
    assert.equal(await totpMatches(RFC_SECRET, junk), false, `rejects ${junk}`);
});

/* ------------------------------------------------------------------- JWT -- */

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function sign(claims: object, secret: string, header = { alg: "HS256" }) {
  const body = `${b64(header)}.${b64(claims)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${Buffer.from(mac)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;
}

const soon = () => Math.floor(Date.now() / 1000) + 300;

test("a well-formed bootstrap token verifies", async () => {
  const token = await sign({ jti: "abcdefgh", exp: soon() }, "secret");
  const claims = await verifyJwt(token, "secret");
  assert.equal(claims?.jti, "abcdefgh");
});

test("tokens are rejected for every reason they should be", async () => {
  const cases: [string, string][] = [
    ["wrong secret", await sign({ jti: "abcdefgh", exp: soon() }, "other")],
    [
      "expired",
      await sign(
        { jti: "abcdefgh", exp: Math.floor(Date.now() / 1000) - 1 },
        "secret",
      ),
    ],
    ["no exp", await sign({ jti: "abcdefgh" }, "secret")],
    ["no jti", await sign({ exp: soon() }, "secret")],
    ["short jti", await sign({ jti: "abc", exp: soon() }, "secret")],
    [
      "exp too far out",
      await sign(
        { jti: "abcdefgh", exp: Math.floor(Date.now() / 1000) + 90000 },
        "secret",
      ),
    ],
    [
      "alg none",
      await sign({ jti: "abcdefgh", exp: soon() }, "secret", { alg: "none" }),
    ],
    [
      "alg confusion",
      await sign({ jti: "abcdefgh", exp: soon() }, "secret", { alg: "HS512" }),
    ],
    ["malformed", "not.a.jwt"],
    ["empty", ""],
  ];
  for (const [why, token] of cases)
    assert.equal(await verifyJwt(token, "secret"), null, `must reject: ${why}`);
});

test("constant-time compare still compares correctly", () => {
  assert.equal(equal("abc", "abc"), true);
  assert.equal(equal("abc", "abd"), false);
  assert.equal(equal("abc", "ab"), false);
  assert.equal(equal("", ""), true);
});
