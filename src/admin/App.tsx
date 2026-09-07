import { useCallback, useEffect, useState } from "react";
import type { SiteConfig } from "../../shared/config";
import {
  ApiError,
  getConfig,
  getSession,
  invalidateStats,
  publishConfig,
  rebuildCv,
  recover,
  registerPasskey,
  revertConfig,
  signIn,
  signOut,
} from "./api";
import type { SessionState } from "./api";
import Editor from "./Editor";
import { Button, Field, Notice, Panel } from "./ui";

type Loaded = { config: SiteConfig; version: number };

const describe = (error: unknown) =>
  error instanceof ApiError
    ? { message: error.message, errors: error.errors }
    : { message: error instanceof Error ? error.message : String(error) };

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof describe>>();
  const [notice, setNotice] = useState<string>();

  const refresh = useCallback(async () => {
    const state = await getSession();
    setSession(state);
    if (state.authenticated) {
      const { config, version } = await getConfig();
      setLoaded({ config, version });
    }
  }, []);

  useEffect(() => {
    refresh().catch((cause) => setError(describe(cause)));
  }, [refresh]);

  /** Every action funnels through here so busy/error handling is uniform. */
  const act = async (work: () => Promise<string | void>) => {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const message = await work();
      if (message) setNotice(message);
    } catch (cause) {
      setError(describe(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!session)
    return <Shell><p className="text-[13px] text-muted">Loading…</p></Shell>;

  if (session.authenticated && loaded)
    return (
      <Shell
        right={
          <Button
            onClick={() =>
              act(async () => {
                await signOut();
                setLoaded(null);
                await refresh();
              })
            }
          >
            Sign out
          </Button>
        }
      >
        <Editor
          key={loaded.version}
          initial={loaded.config}
          version={loaded.version}
          busy={busy}
          error={error}
          notice={notice}
          onPublish={(config) =>
            act(async () => {
              const { version } = await publishConfig(config);
              setLoaded({ config, version });
              return `Published v${version}. Live within a minute.`;
            })
          }
          onRebuildCv={() => act(async () => (await rebuildCv()).note)}
          onInvalidateStats={() =>
            act(async () => (await invalidateStats()).note)
          }
          onRevert={() =>
            act(async () => {
              const { version } = await revertConfig();
              const next = await getConfig();
              setLoaded({ config: next.config, version });
              return `Reverted to v${version}.`;
            })
          }
        />
      </Shell>
    );

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5">
        {error && (
          <Notice kind="error">
            <strong>{error.message}</strong>
          </Notice>
        )}
        {notice && <Notice kind="ok">{notice}</Notice>}
        {session.registered > 0 ? (
          <SignIn busy={busy} act={act} refresh={refresh} />
        ) : (
          <FirstRun busy={busy} act={act} refresh={refresh} open={session.bootstrapOpen} />
        )}
      </div>
    </Shell>
  );
}

function Shell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex w-[min(980px,calc(100%-48px))] items-center justify-between py-7">
        <a href="/" className="flex items-center gap-[10px]">
          <img src="/favicon.svg" width="32" height="32" alt="" className="size-8" />
          <span className="font-mono text-[13px] text-muted">admin</span>
        </a>
        {right}
      </header>
      <main className="mx-auto w-[min(980px,calc(100%-48px))] pb-24">{children}</main>
    </div>
  );
}

function SignIn({
  busy,
  act,
  refresh,
}: {
  busy: boolean;
  act: (work: () => Promise<string | void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [totp, setTotp] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Panel title="Sign in" hint="Your passkey. No password to phish.">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() =>
            act(async () => {
              await signIn();
              await refresh();
            })
          }
        >
          {busy ? "Waiting for authenticator…" : "Continue with passkey"}
        </Button>
      </Panel>

      {showRecovery ? (
        <Panel
          title="Recovery"
          hint="A code from your authenticator app mints a password for enrolling a replacement passkey."
        >
          <div className="flex flex-col gap-4">
            <Field label="TOTP code" mono value={totp} onChange={setTotp} />
            <Button
              disabled={busy || totp.length < 6}
              onClick={() =>
                act(async () => {
                  const { password: issued } = await recover(totp);
                  setPassword(issued);
                  return "Password issued. Register a replacement passkey below.";
                })
              }
            >
              Get recovery password
            </Button>
            {password && (
              <>
                <Field label="Recovery password" mono value={password} onChange={setPassword} />
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await registerPasskey({ password, label: "recovered" });
                      await refresh();
                      return "Passkey registered.";
                    })
                  }
                >
                  Register replacement passkey
                </Button>
              </>
            )}
          </div>
        </Panel>
      ) : (
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className="self-start text-[12px] text-muted underline underline-offset-4 hover:text-accent"
        >
          Lost your passkey?
        </button>
      )}
    </>
  );
}

function FirstRun({
  busy,
  act,
  refresh,
  open,
}: {
  busy: boolean;
  act: (work: () => Promise<string | void>) => Promise<void>;
  refresh: () => Promise<void>;
  open: boolean;
}) {
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");

  if (!open)
    return (
      <Panel title="Closed">
        <p className="text-[13px] text-muted">
          No passkey is registered, but bootstrap is closed. Re-arm it by setting{" "}
          <code className="font-mono text-accent">bootstrap_armed</code> to{" "}
          <code className="font-mono text-accent">yes</code> in the D1{" "}
          <code className="font-mono text-accent">state</code> table.
        </p>
      </Panel>
    );

  return (
    <Panel
      title="First run"
      hint="Paste the password from the bootstrap curl, and a code from the authenticator app you scanned the TOTP secret into."
    >
      <div className="flex flex-col gap-4">
        <Field label="Bootstrap password" mono value={password} onChange={setPassword} />
        <Field label="TOTP code" mono value={totp} onChange={setTotp} />
        <p className="text-[12px] text-muted">
          The TOTP code is required. It is the only way back in if this passkey is
          ever lost, so it cannot be skipped.
        </p>
        <Button
          variant="primary"
          disabled={busy || !password || totp.length < 6}
          onClick={() =>
            act(async () => {
              await registerPasskey({ password, totp, label: "first device" });
              await refresh();
              return "Passkey registered. Bootstrap is now closed.";
            })
          }
        >
          {busy ? "Waiting for authenticator…" : "Register passkey"}
        </Button>
      </div>
    </Panel>
  );
}
