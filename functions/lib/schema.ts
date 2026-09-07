/* Single source for the auth tables. Applied lazily on first use rather than as
   a separate migration step, so there is no way to deploy the Functions without
   the tables existing. Every statement is IF NOT EXISTS, so it is idempotent
   and cheap after the first call in an isolate. */
const statements = [
  // Registered passkeys. More than one is expected: a laptop and a phone.
  `CREATE TABLE IF NOT EXISTS credentials (
     id TEXT PRIMARY KEY, public_key TEXT NOT NULL, counter INTEGER NOT NULL,
     transports TEXT, label TEXT, created_at INTEGER NOT NULL, last_used INTEGER)`,
  // Short-lived WebAuthn challenges; deleted on use, expiry is a backstop.
  `CREATE TABLE IF NOT EXISTS challenges (
     id TEXT PRIMARY KEY, challenge TEXT NOT NULL, purpose TEXT NOT NULL,
     expires_at INTEGER NOT NULL)`,
  // Server-side sessions, so a stolen cookie can be revoked.
  `CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`,
  // Single-use bootstrap/recovery passwords, stored only as hashes.
  `CREATE TABLE IF NOT EXISTS otps (
     id TEXT PRIMARY KEY, purpose TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  // Consumed bootstrap JWT ids, so a captured token cannot be replayed.
  `CREATE TABLE IF NOT EXISTS used_tokens (
     jti TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)`,
  // 'totp_secret', 'totp_enrolled', 'bootstrap_armed'.
  `CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  // Fixed-window rate limiting for the unauthenticated surface.
  `CREATE TABLE IF NOT EXISTS attempts (
     bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`,
];

let applied = false;

export async function ensureSchema(db: D1Database) {
  if (applied) return;
  await db.batch(statements.map((sql) => db.prepare(sql)));
  applied = true;
}
