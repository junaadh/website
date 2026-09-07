/**
 * One command for the whole stack: Vite for HMR, Wrangler in front of it for the
 * Pages Functions, local KV and local D1. Everything is served from the Wrangler
 * port, so `/api/*` and the edge rewrite behave the way they will in production
 * while the React app still hot-reloads.
 *
 * `bun run dev:vite` remains for when Functions are irrelevant and the extra
 * process is just overhead.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

/** Asks the OS for a free port, so a stray dev server can't block startup. */
const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    // Probe on ::1: Wrangler's --proxy resolves IPv6 only, so that is the
    // family that actually has to be free.
    probe.listen(0, "::1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

const VITE_PORT = await freePort();
const EDGE_PORT = Number(process.env.PORT) || 8788;

const children = [];
let shuttingDown = false;

function run(label, command, args) {
  const child = spawn(command, args, {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  child.on("exit", (code) => {
    // If either half dies the pair is useless; take the whole thing down.
    if (!shuttingDown && code !== 0) {
      console.error(`\n${label} exited (${code}); stopping.`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 200);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown(0));

/**
 * Resolves once something is listening, so Wrangler never proxies into a void.
 * Tries both loopback families: Vite binds `localhost`, which on macOS can
 * resolve to ::1 only, and probing just 127.0.0.1 would never connect.
 */
async function waitFor(port, timeoutMs = 30000) {
  const hosts = ["[::1]", "127.0.0.1", "localhost"];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const host of hosts) {
      try {
        await fetch(`http://${host}:${port}/`);
        return true;
      } catch {
        /* try the next family */
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

const social = run("build-social", "node", ["scripts/build-social.mjs"]);
const [socialCode] = await once(social, "exit");
if (socialCode !== 0) process.exit(socialCode);
children.length = 0;

/* strictPort so the proxy target can never drift, and --host ::1 because
   Wrangler's --proxy fetches the IPv6 address only (it warns about this). */
run("vite", "bunx", [
  "vite",
  "--port",
  String(VITE_PORT),
  "--strictPort",
  "--host",
  "::1",
  "--clearScreen",
  "false",
]);

if (!(await waitFor(VITE_PORT))) {
  console.error("Vite did not come up in time.");
  shutdown(1);
} else {
  console.log(`\n  Functions + HMR   http://localhost:${EDGE_PORT}`);
  console.log(`  Vite only         http://localhost:${VITE_PORT}\n`);
  run("wrangler", "bunx", [
    "wrangler",
    "pages",
    "dev",
    "--proxy",
    String(VITE_PORT),
    "--port",
    String(EDGE_PORT),
    "--compatibility-date=2026-09-01",
    "--kv=CONFIG",
    "--d1=AUTH",
    "--r2=MEDIA",
    "--log-level=warn",
  ]);
}
