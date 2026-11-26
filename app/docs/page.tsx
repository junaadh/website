import type { Metadata } from "next";
import Link from "next/link";
import { Callout, DocHeader, H2, OnThisPage, Pager } from "@/components/docs/Doc";
import { Sample } from "@/components/docs/Sample";

export const metadata: Metadata = {
  title: "Overview",
  description: "What this site is, the three ways to use it, and where your scripts live.",
};

const entries = [
  {
    key: "⌘K / Ctrl K",
    name: "Command palette",
    text: "Search every action on the page: built-in ones such as Open console and Go to Work, and any a script has registered.",
    href: "/docs/console/",
    cta: "Console guide",
  },
  {
    key: "`",
    name: "Console",
    text: "An editor for Eitri scripts. A script can change the look of the page, reorder the work, react to events and add its own commands.",
    href: "/docs/console/",
    cta: "Console guide",
  },
  {
    key: "/card",
    name: "Card studio",
    text: "Design a GitHub profile card in Eitri, preview it live and embed it in a README as an SVG.",
    href: "/docs/card/",
    cta: "Card guide",
  },
];

export default function DocsHome() {
  return (
    <>
      <DocHeader path="/docs" title="Documentation">
        <p>
          This site is a portfolio you can script. Its look, its content and its commands are
          controlled by programs written in <Link href="/work/eitri/">Eitri</Link>, a small language
          I wrote, and a second tool uses the same language to draw GitHub profile cards. These
          pages explain both.
        </p>
      </DocHeader>

      <OnThisPage
        items={[
          { id: "entry-points", title: "Three ways in" },
          { id: "first-script", title: "A first script" },
          { id: "scripts", title: "Saving and sharing" },
          { id: "privacy", title: "Privacy" },
          { id: "shortcuts", title: "Keyboard shortcuts" },
          { id: "next", title: "Where next" },
        ]}
      />

      <H2 id="entry-points" title="Three ways in" />
      <div className="wide mb-6 grid gap-4 @2xl:grid-cols-3">
        {entries.map((e) => (
          <div key={e.name} className="hud flex flex-col p-4">
            <p className="label mb-3 text-signal">{e.key}</p>
            <h3 className="mt-0 mb-2 text-base">{e.name}</h3>
            <p className="mb-4 text-sm">{e.text}</p>
            <Link href={e.href} className="label mt-auto">
              {e.cta} →
            </Link>
          </div>
        ))}
      </div>
      <p>
        The palette and the console are on every page. The console opens with the backtick key, from
        Open console in the palette, or from the Console button in the top bar. The card studio is a
        page of its own at <Link href="/card/">/card</Link>.
      </p>

      <H2 id="first-script" title="A first script" />
      <p>
        Open the console, replace the text with this, and press Run (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd>{" "}
        + <kbd>Enter</kbd>). The accent colour turns magenta, rain starts, the hero gets a new title
        and the console prints one line. Reset puts everything back.
      </p>
      <Sample id="quick-start" />
      <p>
        The language is covered in <Link href="/docs/eitri/">the Eitri tour</Link>, and every
        function a script can call is in <Link href="/docs/sdk/">the SDK reference</Link>.
      </p>

      <H2 id="scripts" title="Saving and sharing" />
      <ul>
        <li>
          <strong>Saved scripts.</strong> A script that runs cleanly with Run is saved in this
          browser (local storage). On later visits it runs again right after the page loads,
          silently: no toasts, sounds, effects, prompts or navigation, but the look, the content and
          every action, handler, key binding and timer it registers are back.
        </li>
        <li>
          <strong>Share links.</strong> Share in the console copies a link ending in{" "}
          <code>#eitri=…</code>. Opening it runs that script. It is not saved unless you press Run.
        </li>
        <li>
          <strong>Reset.</strong> Reset in the console, or Reset the page in the palette, clears the
          saved script and returns the page to its defaults.
        </li>
        <li>
          <strong>Cards.</strong> The studio remembers its script and username in the browser too. A
          card can be shared as a short link, which stores the script on the server, or as a long
          link that carries the whole script.
        </li>
      </ul>
      <p>
        Details are in <Link href="/docs/console/#saving">the console guide</Link> and{" "}
        <Link href="/docs/card/#embedding">the card guide</Link>.
      </p>

      <H2 id="privacy" title="Privacy" />
      <p>
        Eitri runs in your browser, compiled to WebAssembly. Console scripts, your saved script,
        your visit count and your preferences stay in this browser&apos;s local storage; nothing
        about them is sent to a server.
      </p>
      <Callout title="What does leave the browser">
        <ul>
          <li>
            In the card studio, the GitHub username you type is sent to this site&apos;s{" "}
            <code>/api/card/&lt;user&gt;.json</code>, which fetches public profile data from GitHub.
            The script itself is drawn in your browser.
          </li>
          <li>
            Save · short link sends the card script to <code>POST /api/card/scripts</code>, which
            stores it in Cloudflare KV so an embed can say <code>?script=&lt;id&gt;</code>. Nothing
            else is stored.
          </li>
          <li>
            An embed URL is requested by whoever views the README that contains it. With{" "}
            <code>?s=</code> the script travels in the URL.
          </li>
        </ul>
      </Callout>

      <H2 id="shortcuts" title="Keyboard shortcuts" />
      <p>
        <kbd>⌘</kbd> is <kbd>Ctrl</kbd> on Windows and Linux.
      </p>
      <table>
        <thead>
          <tr>
            <th>Keys</th>
            <th>Where</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <kbd>`</kbd>
            </td>
            <td>Anywhere except a text field</td>
            <td>Open or close the console.</td>
          </tr>
          <tr>
            <td>
              <kbd>⌘</kbd> <kbd>K</kbd>
            </td>
            <td>Anywhere, even in a field</td>
            <td>Open or close the command palette.</td>
          </tr>
          <tr>
            <td>
              <kbd>Esc</kbd>
            </td>
            <td>Console, palette, key mode</td>
            <td>
              Close the palette or the console (when focus is in it); leave a key mode started by a
              script.
            </td>
          </tr>
          <tr>
            <td>
              <kbd>⌘</kbd> <kbd>Enter</kbd>
            </td>
            <td>Console editor</td>
            <td>Run the script and save it if it ran cleanly.</td>
          </tr>
          <tr>
            <td>
              <kbd>Tab</kbd>
            </td>
            <td>Console editor</td>
            <td>Insert four spaces.</td>
          </tr>
          <tr>
            <td>
              <kbd>Ctrl</kbd> <kbd>M</kbd>
            </td>
            <td>Console editor</td>
            <td>Make Tab move focus instead of inserting spaces; press again to undo.</td>
          </tr>
          <tr>
            <td>
              <kbd>←</kbd> <kbd>→</kbd>
            </td>
            <td>Console resize handle</td>
            <td>Widen or narrow the docked console by 20 px (80 px with Shift).</td>
          </tr>
          <tr>
            <td>
              <kbd>↑</kbd> <kbd>↓</kbd>
            </td>
            <td>Palette</td>
            <td>
              Move through the list (also <kbd>Ctrl</kbd> <kbd>N</kbd> and <kbd>Ctrl</kbd>{" "}
              <kbd>P</kbd>); <kbd>Page Up</kbd> and <kbd>Page Down</kbd> jump by eight.
            </td>
          </tr>
          <tr>
            <td>
              <kbd>Enter</kbd>
            </td>
            <td>Palette</td>
            <td>Run the highlighted action, or answer the prompt.</td>
          </tr>
          <tr>
            <td>
              <kbd>↑</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>{" "}
              <kbd>←</kbd> <kbd>→</kbd> <kbd>B</kbd> <kbd>A</kbd>
            </td>
            <td>Page</td>
            <td>
              Does nothing by itself; scripts can react to it with the <code>konami</code> event.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Scripts can add their own keys with <Link href="/docs/sdk/keys/">site/keys</Link>. The
        default script binds <kbd>Shift</kbd> <kbd>H</kbd> to a greeting.
      </p>

      <H2 id="next" title="Where next" />
      <ul>
        <li>
          <Link href="/docs/console/">Console</Link>: the panel, the editor and what a run does.
        </li>
        <li>
          <Link href="/docs/eitri/">Eitri language</Link>: a short tour for JavaScript and
          TypeScript developers.
        </li>
        <li>
          <Link href="/docs/sdk/">SDK reference</Link>: every function, generated from the
          declaration files.
        </li>
        <li>
          <Link href="/docs/card/">Card studio</Link> and{" "}
          <Link href="/docs/card/api/">HTTP API</Link>.
        </li>
      </ul>

      <Pager href="/docs/" />
    </>
  );
}
