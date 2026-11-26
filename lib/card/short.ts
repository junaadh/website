// Short links for card scripts: a content-addressed id instead of the whole
// script in the URL. Pure TypeScript (Web Crypto), shared by the API and the
// studio.

/** Longest script that can be saved, in bytes. */
export const MAX_STORED = 16_384;

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 11 base62 characters from the script's SHA-256: about 65 bits. */
export const ID = /^[0-9A-Za-z]{11}$/;

export async function scriptId(script: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(script)),
  );
  let n = 0n;
  for (const byte of digest.slice(0, 9)) n = (n << 8n) | BigInt(byte);
  let id = "";
  for (let i = 0; i < 11; i++) {
    id = ALPHABET[Number(n % 62n)] + id;
    n /= 62n;
  }
  return id;
}

export const scriptKey = (id: string) => `card-script:${id}`;
