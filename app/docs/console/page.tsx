import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout, DocHeader, H2, H3, OnThisPage, Pager } from "@/components/docs/Doc";
import { Diagnostic, Sample } from "@/components/docs/Sample";
import { inspectScript } from "@/lib/docs/render";
import { EXAMPLES } from "@/lib/eitri/examples";
import { LIMITS } from "@/lib/eitri/model";

export const metadata: Metadata = {
  title: "Console",
  description:
    "The Eitri console: opening it, the editor, the output tabs, examples, sharing, saved scripts and limits.",
};

const TOUR = `import site from "site"
let n = 2 + 3
site.print("n is \${n}")
`;

const groups = [...new Set(EXAMPLES.map((e) => e.group))];

const fmt = (n: number) => n.toLocaleString("en-US");

export default async function ConsoleDocs() {
  const [tokens, ast, asm] = await Promise.all([
    inspectScript(TOUR, "tokens"),
    inspectScript(TOUR, "ast"),
    inspectScript(TOUR, "asm"),
  ]);
  const head = (text: string, lines: number) => text.split("\n").slice(0, lines).join("\n");

  return (
    <>
      <DocHeader path="/docs/console" title="Console">
        <p>
          The console is an editor and a runtime for <Link href="/docs/eitri/">Eitri</Link> scripts.
          What a script does to the page is described by the <Link href="/docs/sdk/">site SDK</Link>
          .
        </p>
      </DocHeader>

      <OnThisPage
        items={[
          { id: "opening", title: "Opening it" },
          { id: "layout", title: "Docked panel and sheet" },
          { id: "editor", title: "The editor" },
          { id: "tabs", title: "Output, Tokens, AST, Bytecode, Docs" },
          { id: "examples", title: "Examples" },
          { id: "share", title: "Share links" },
          { id: "saving", title: "Saved scripts" },
          { id: "runs", title: "What a run is" },
          { id: "limits", title: "Limits" },
        ]}
      />

      <H2 id="opening" title="Opening it" />
      <ul>
        <li>
          Press <kbd>`</kbd> (backtick) anywhere that is not a text field. Press it again to close.
        </li>
        <li>
          Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd> and choose <strong>Open console</strong>
          .
        </li>
        <li>
          Click <strong>Console</strong> in the top bar (it shows as <code>&gt;_</code> on narrow
          screens).
        </li>
      </ul>
      <p>
        The console has a <strong>Docs ↗</strong> link in its header that comes back here. The page
        behind it stays interactive, so you can try a script and the effect at the same time.
      </p>

      <H2 id="layout" title="Docked panel and sheet" />
      <p>
        On a window at least 1024 px wide the console <strong>docks</strong> on the right edge and
        the page reflows into the space beside it. Layouts on this site respond to the width of the
        page, not the window, so the page rearranges itself instead of being covered.
      </p>
      <ul>
        <li>
          <strong>Resize</strong> by dragging the thin bar on the console&apos;s left edge, or focus
          it and press <kbd>←</kbd>/<kbd>→</kbd> (20 px a step, 80 with Shift). The console is never
          narrower than 360 px and always leaves 480 px for the page.
        </li>
        <li>
          The <strong>width is remembered</strong>, and a docked console that was open stays open on
          your next visit.
        </li>
        <li>
          Docked, <kbd>Esc</kbd> closes it only when focus is inside it, and <kbd>Tab</kbd> is not
          trapped, because the page is still in use.
        </li>
      </ul>
      <p>
        On narrower windows it is a <strong>sheet</strong> over the bottom of the screen, up to 70%
        of the window high. It behaves as a dialog: <kbd>Esc</kbd> closes it, <kbd>Tab</kbd> stays
        inside, and focus returns to where it was when it closes.
      </p>

      <H2 id="editor" title="The editor" />
      <p>
        The editor highlights Eitri with the language&apos;s tree-sitter grammar, which is fetched
        the first time the console opens, so colours appear a moment after the text. It has a line
        gutter and does not wrap lines.
      </p>
      <table>
        <thead>
          <tr>
            <th>Keys</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>
            </td>
            <td>Run the script.</td>
          </tr>
          <tr>
            <td>
              <kbd>Tab</kbd>
            </td>
            <td>Insert four spaces at the cursor (it replaces a selection).</td>
          </tr>
          <tr>
            <td>
              <kbd>Ctrl</kbd> + <kbd>M</kbd>
            </td>
            <td>
              Toggle whether Tab moves focus out of the editor, for keyboard users. A toast says
              which mode is on.
            </td>
          </tr>
        </tbody>
      </table>
      <p>Typing changes nothing on the page until you run the script.</p>

      <H2 id="tabs" title="Output, Tokens, AST, Bytecode, Docs" />
      <H3 id="tab-output" title="Output" />
      <p>
        The outcome of the last run and how long it took to compile and run, then everything the
        script printed with <code>site.print</code> and every toast it showed (marked{" "}
        <code>toast</code>). The outcome is one of:
      </p>
      <ul>
        <li>
          <strong>OK</strong>: the script ran and the page was updated.
        </li>
        <li>
          <strong>Compile error</strong>: the script was rejected before it ran. The report shows
          the line with a caret under the problem.
        </li>
        <li>
          <strong>Runtime fault</strong>: the script ran and stopped, for example on an integer
          overflow, an index out of bounds or because it used up its step budget.
        </li>
        <li>
          <strong>Host error</strong>: the runtime itself could not be started.
        </li>
      </ul>
      <p>
        A run that is not OK does not change the page, so a half-typed script never flickers the
        look. Faults inside later callbacks (a timer, an event handler) are added to the output as
        error lines and shown once as a toast.
      </p>
      <Diagnostic id="diag-compile" />
      <Diagnostic id="diag-fault" />
      <H3 id="tab-inspect" title="Tokens, AST and Bytecode" />
      <p>
        Three views of the script in the editor that follow your typing (about 200 ms after you
        stop) while their tab is open. You do not need to run anything. They are useful for learning
        what the compiler makes of a line. The same three-line script as above gives:
      </p>
      <CodeBlock code={TOUR} label="script" />
      <CodeBlock code={head(tokens, 10)} label="Tokens (first lines)" language="text" />
      <CodeBlock code={ast} label="AST" language="text" />
      <CodeBlock code={head(asm, 15)} label="Bytecode (first lines)" language="text" />
      <H3 id="tab-docs" title="Docs" />
      <p>
        The SDK declaration files with a button per module and the import line to use, highlighted.
        They are the same files the <Link href="/docs/sdk/">SDK reference</Link> is generated from.
      </p>

      <H2 id="examples" title="Examples" />
      <p>
        The <strong>Examples…</strong> menu next to Run replaces the editor text with a ready-made
        script. It does not run it; look at it, change it, then press Run. Each one is run against
        the real runtime by the site&apos;s checks.
      </p>
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g}>
              <td>{g}</td>
              <td>
                {EXAMPLES.filter((e) => e.group === g)
                  .map((e) => e.title)
                  .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Sample id="example-hover-sparks" />
      <p>
        <strong>Reset</strong> clears the saved script, drops everything the script registered,
        restores the default page and puts the starter script back in the editor. It also removes{" "}
        <code>#eitri=</code> from the address bar.
      </p>

      <H2 id="share" title="Share links" />
      <p>
        <strong>Share</strong> copies the current page address with the script appended as{" "}
        <code>#eitri=&lt;base64url&gt;</code>: the script as UTF-8, base64url encoded, not
        compressed. Whoever opens the link gets the script in their editor and it runs when the page
        loads. It is not saved for them until they press Run.
      </p>
      <p>
        The part after <code>#</code> is never sent to a server. A long script makes a long link.
        Because the script runs as soon as the link is opened, treat links like any other code: they
        run inside the same sandbox and limits as anything you type, and they can only do what the{" "}
        <Link href="/docs/sdk/">SDK</Link> allows.
      </p>

      <H2 id="saving" title="Saved scripts" />
      <p>
        When Run finishes with OK, the script is saved in local storage. A script that does not
        compile or faults is not saved. On your next visit it runs again just after the page loads,
        as a <strong>silent replay</strong>:
      </p>
      <ul>
        <li>
          Look and content changes, actions, handlers, key bindings, modes and timers all come back.
        </li>
        <li>
          Toasts, sounds, one-shot effects (<code>site/fx</code>), prompts, <code>site.goto</code>{" "}
          and <code>site.open</code> do not happen, so the page does not jump or make noise on
          arrival.
        </li>
        <li>
          <code>site.visits</code> counts the page loads that replayed a saved script, this one
          included.
        </li>
      </ul>
      <Sample id="example-welcome-back" />
      <p>
        A <code>#eitri=</code> link in the address wins over the saved script and is not a silent
        replay. Local storage can be unavailable (some private modes); the console then works but
        nothing is remembered.
      </p>

      <H2 id="runs" title="What a run is" />
      <p>Each press of Run starts from a clean slate:</p>
      <ol>
        <li>
          The look and the content (title, project order, hidden, highlighted and badged projects,
          readouts, banner) return to their defaults, and the previous program is dropped: its
          actions, event handlers, key bindings, modes and timers are gone.
        </li>
        <li>The script runs from the top, in a new context. Its variables start fresh.</li>
        <li>
          Calls into the page are recorded while it runs and applied together when it finishes
          without a fault.
        </li>
      </ol>
      <p>
        The script&apos;s last line is not the end of it. Actions, handlers, key bindings and timers
        it registered stay alive, with the variables they close over,{" "}
        <strong>until the next run</strong>, a call to <code>site.stop()</code>, or Reset. Each
        callback runs with a fresh step budget and the clock of the moment it is called.
      </p>
      <Callout>
        <p>
          So a look is described by the top level of a script. A <code>theme.hue(…)</code> inside a
          callback changes the page when it runs, but the next Run starts over from the default hue.
        </p>
      </Callout>

      <H2 id="limits" title="Limits" />
      <p>
        Scripts are untrusted code, so everything is capped. Exceeding a runtime limit is a fault;
        the page-side caps quietly drop or clamp the extra. The first four come from the Eitri build
        in use (<code>crates/eitri-wasm</code>), the rest from the site&apos;s runtime (
        <code>lib/eitri/model.ts</code>).
      </p>
      <table>
        <thead>
          <tr>
            <th>Limit</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Step budget</td>
            <td>
              2,000,000 steps per run and per callback. Each call and each backward jump costs one.
            </td>
          </tr>
          <tr>
            <td>Memory</td>
            <td>32 MiB for the whole program, including the compiled code.</td>
          </tr>
          <tr>
            <td>Script size</td>
            <td>64 KiB of source.</td>
          </tr>
          <tr>
            <td>Recorded calls</td>
            <td>
              10,000 per run or callback; the site applies at most {fmt(LIMITS.effectsPerBatch)} of
              them.
            </td>
          </tr>
          <tr>
            <td>Live callbacks</td>
            <td>256 (actions, handlers, timers and open prompts together).</td>
          </tr>
          <tr>
            <td>Actions</td>
            <td>{LIMITS.actions}</td>
          </tr>
          <tr>
            <td>Key bindings</td>
            <td>{LIMITS.bindings}</td>
          </tr>
          <tr>
            <td>Timers</td>
            <td>
              {LIMITS.timers} at once. <code>after</code> waits at least {LIMITS.afterMin} ms,{" "}
              <code>every</code> at least {LIMITS.everyMin} ms, and neither more than 24 hours.
            </td>
          </tr>
          <tr>
            <td>Handlers</td>
            <td>{LIMITS.handlersPerEvent} per event.</td>
          </tr>
          <tr>
            <td>One-shot effects</td>
            <td>
              {LIMITS.oneShotsPerBatch} per run or callback (toasts, effects, sounds, navigation).
            </td>
          </tr>
          <tr>
            <td>Readout rows, badges</td>
            <td>
              {LIMITS.readouts} rows; {LIMITS.badgesPerCard} badges per project card.
            </td>
          </tr>
          <tr>
            <td>Console output</td>
            <td>The last {LIMITS.log} lines.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Timers that repeat pause while the tab is hidden. Pointer-hover events are limited to ten a
        second per project and other events to twenty a second. Text lengths and numeric ranges are
        listed with each function in the <Link href="/docs/sdk/">SDK reference</Link>.
      </p>

      <Pager href="/docs/console/" />
    </>
  );
}
