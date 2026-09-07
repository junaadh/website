import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { SiteConfig } from "../../shared/config";

export type SessionState = {
  authenticated: boolean;
  registered: number;
  totpEnrolled: boolean;
  bootstrapOpen: boolean;
  credentials?: {
    id: string;
    label: string | null;
    created_at: number;
    last_used: number | null;
  }[];
};

export class ApiError extends Error {
  status: number;
  errors?: string[];
  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    // The session cookie is HttpOnly; it has to ride along explicitly.
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new ApiError(
      typeof body.error === "string" ? body.error : response.statusText,
      response.status,
      Array.isArray(body.errors) ? (body.errors as string[]) : undefined,
    );
  return body as T;
}

export const getSession = () => call<SessionState>("/api/auth/session");

export const signOut = () =>
  call<SessionState>("/api/auth/session", { method: "DELETE" });

export const getConfig = () =>
  call<{ version: number; published: boolean; config: SiteConfig }>(
    "/api/config",
  );

export const publishConfig = (config: SiteConfig) =>
  call<{ version: number }>("/api/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });

/** Typst cannot run at the edge, so this queues a CI render into R2. */
export const rebuildCv = () =>
  call<{ queued: boolean; note: string }>("/api/cv/rebuild", { method: "POST" });

/** Bumps the stats version; every cached card variant misses at once. */
export const invalidateStats = () =>
  call<{ version: number; note: string }>("/api/stats/invalidate", {
    method: "POST",
  });

export const revertConfig = () =>
  call<{ version: number }>("/api/config/revert", { method: "POST" });

/** Exchanges a TOTP code for a short-lived registration password. */
export const recover = (totp: string) =>
  call<{ password: string }>("/api/auth/recover", {
    method: "POST",
    body: JSON.stringify({ totp }),
  });

/**
 * Two round trips by design: the server mints and stores the challenge, the
 * authenticator signs it, and the server verifies against the stored copy so a
 * replayed response cannot be accepted.
 */
export async function registerPasskey(input: {
  password?: string;
  totp?: string;
  label: string;
}) {
  const start = await call<{
    challengeId: string;
    options: Parameters<typeof startRegistration>[0]["optionsJSON"];
    totpRequired: boolean;
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ step: "options", password: input.password }),
  });
  const response = await startRegistration({ optionsJSON: start.options });
  return call<{ registered: boolean; credentials: number }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        step: "verify",
        challengeId: start.challengeId,
        response,
        totp: input.totp,
        label: input.label,
      }),
    },
  );
}

export async function signIn() {
  const start = await call<{
    challengeId: string;
    options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ step: "options" }),
  });
  const response = await startAuthentication({ optionsJSON: start.options });
  return call<{ authenticated: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      step: "verify",
      challengeId: start.challengeId,
      response,
    }),
  });
}
