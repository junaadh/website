import type { Metadata } from "next";
import Link from "next/link";
import { CardPreview } from "@/components/docs/CardPreview";
import { Callout, DocHeader, H2, H3, OnThisPage, Pager } from "@/components/docs/Doc";
import { Diagnostic, Sample } from "@/components/docs/Sample";
import { PRESETS } from "@/lib/card/presets";
import { renderCardSvg, svgDataUrl } from "@/lib/docs/render";
import { profile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Card studio",
  description:
    "Design a GitHub profile card in Eitri: the studio, presets, the drawing model, charts, embedding and the security model.",
};

const SITE = profile.links.website;

/** The ?name=default parameters a preset reads, found in its source. */
function paramsOf(source: string): { name: string; fallback: string }[] {
  const out: { name: string; fallback: string }[] = [];
  for (const m of source.matchAll(/card\.param\("([^"]+)",\s*"([^"]*)"\)/g)) {
    if (!out.some((p) => p.name === m[1])) out.push({ name: m[1] ?? "", fallback: m[2] ?? "" });
  }
  return out;
}

/** The preset's one-line description without the trailing "?theme, ?accent" note. */
const shows = (description: string) => description.replace(/\s\?.*$/, "");

export default async function CardDocs() {
  const presets = await Promise.all(
    PRESETS.map(async (p) => ({
      ...p,
      params: paramsOf(p.source),
      image: svgDataUrl(await renderCardSvg(p.source)),
    })),
  );

  return (
    <>
      <DocHeader path="/docs/card" title="Card studio">
        <p>
          The <Link href="/card/">card studio</Link> draws a GitHub profile card as an SVG for a
          README. You write the card as an Eitri script, see it update as you type, then copy the
          embed URL. The same script runs on the server and draws the same image.
        </p>
      </DocHeader>

      <OnThisPage
        items={[
          { id: "studio", title: "The studio" },
          { id: "presets", title: "Presets" },
          { id: "drawing", title: "Drawing model" },
          { id: "charts", title: "Charts" },
          { id: "motion", title: "Motion" },
          { id: "helpers", title: "Helpers" },
          { id: "errors", title: "Errors as images" },
          { id: "embedding", title: "Embedding" },
          { id: "security", title: "Security model" },
        ]}
      />

      <H2 id="studio" title="The studio" />
      <ul>
        <li>
          <strong>GitHub username.</strong> Whose data the card shows: a GitHub login, up to 39
          characters. The profile is fetched from this site&apos;s{" "}
          <code>/api/card/&lt;user&gt;.json</code> about half a second after you stop typing. If the
          endpoint cannot be reached (for example in plain <code>bun run dev</code>), or the name is
          not valid, the studio draws the bundled sample profile and says so.
        </li>
        <li>
          <strong>Preset.</strong> A ready-made script. Choosing one replaces the script; editing
          the text switches the menu to <em>Custom script</em>.
        </li>
        <li>
          <strong>Params.</strong> Up to 16 name and value pairs (names up to 32 characters, values
          up to 100). A script reads them with <code>card.param(name, fallback)</code>; rows with an
          empty name are ignored and the first row wins when a name repeats.
        </li>
        <li>
          <strong>Editor.</strong> The same editor as the console, with <kbd>Tab</kbd> for spaces
          and <kbd>Ctrl</kbd> + <kbd>M</kbd> to let Tab move focus. There is no Run: the preview
          redraws about 150 ms after each change.
        </li>
        <li>
          <strong>Preview.</strong> Drawn in your browser by the same wasm and the same renderer the
          server uses, with the time it took and the outcome beside it.
        </li>
        <li>
          <strong>Embed.</strong> The SVG URL, Markdown and HTML snippets with Copy buttons,{" "}
          <strong>Download SVG</strong>, and <strong>Save · short link</strong> (see{" "}
          <a href="#embedding">Embedding</a>).
        </li>
      </ul>
      <p>
        The studio keeps your script and username in this browser. It can also start from the
        address: <code>?u=&lt;user&gt;</code>, <code>?preset=&lt;id&gt;</code>,{" "}
        <code>?s=&lt;encoded script&gt;</code>, and any other <code>?name=value</code> becomes a
        param. The &quot;Open in card studio&quot; buttons on these pages use that.
      </p>
      <Callout>
        <p>
          Every card on the docs pages is drawn at build time for a bundled sample profile with
          invented numbers, not for a real account, so you can see what a script does without any
          data.
        </p>
      </Callout>

      <H2 id="presets" title="Presets" />
      <p>
        Pick one with <code>?preset=&lt;id&gt;</code> on the API, or in the studio&apos;s menu. The
        parameters are read from each script, with the value used when you do not set one.
      </p>
      <table className="wide">
        <thead>
          <tr>
            <th>Id</th>
            <th>Shows</th>
            <th>Parameters</th>
          </tr>
        </thead>
        <tbody>
          {presets.map((p) => (
            <tr key={p.id}>
              <td>
                <code>{p.id}</code>
              </td>
              <td className="!whitespace-normal">
                <strong>{p.title}.</strong> {shows(p.description)}
              </td>
              <td className="!whitespace-normal">
                {p.params.length === 0
                  ? "none"
                  : p.params.map((q, i) => (
                      <span key={q.name}>
                        {i > 0 && ", "}
                        <code>{q.name}</code> ({q.fallback})
                      </span>
                    ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="wide mb-8 grid items-start gap-4 @3xl:grid-cols-2">
        {presets.map((p) => (
          <div key={p.id} className="hud min-w-0 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="label text-signal">{p.id}</span>
              <Link href={`/card/?preset=${p.id}`} className="label hover:text-signal">
                Open in card studio
              </Link>
            </div>
            <CardPreview src={p.image} alt={`The ${p.title} preset`} caption={p.title} />
          </div>
        ))}
      </div>

      <H2 id="drawing" title="Drawing model" />
      <p>
        A card script draws with canvas-style calls from{" "}
        <code>import card from &quot;card&quot;</code>. Everything is in pixels from the{" "}
        <strong>top left</strong> corner, and later calls paint over earlier ones.{" "}
        <code>card.user</code> is the profile (see the field list in the{" "}
        <Link href="/docs/sdk/card/">card SDK</Link>).
      </p>
      <ul>
        <li>
          <strong>Canvas.</strong> <code>card.size(w, h)</code> sets the card to 100-1200 by 50-1200
          px (default 495 by 195). <code>card.background(color, radius)</code> fills it and rounds
          the corners; <code>card.border(color, width)</code> draws a frame just inside the edge.
        </li>
        <li>
          <strong>The pen is stateful.</strong> <code>card.fill</code>, <code>card.stroke</code>,{" "}
          <code>card.font</code>, <code>card.align</code> and <code>card.opacity</code> set the pen;
          shapes, text, icons and charts use whatever it is when they are drawn, until you change
          it. <code>card.stroke(&quot;none&quot;, 0)</code> turns the outline off.
        </li>
        <li>
          <strong>Shapes.</strong> <code>rect</code>, <code>circle</code>, <code>line</code>,{" "}
          <code>text</code>, <code>icon</code> and <code>avatar</code>. Text is placed by its{" "}
          <em>baseline</em> at <code>y</code>, and <code>card.align</code> decides whether{" "}
          <code>x</code> is its start, middle or end. Positions may sit up to 50 px outside the
          card; sizes are clamped to sane ranges.
        </li>
        <li>
          <strong>Opacity.</strong> <code>card.opacity(0-100)</code> applies to everything drawn
          after it, on top of any alpha in the colour itself.
        </li>
        <li>
          <strong>Colours</strong> are <code>&quot;#rgb&quot;</code>,{" "}
          <code>&quot;#rrggbb&quot;</code>, <code>&quot;#rrggbbaa&quot;</code> (the last two digits
          are alpha), <code>&quot;none&quot;</code>, or <code>&quot;@name&quot;</code>, a gradient
          you defined earlier with <code>card.gradient(name, from, to, angle)</code>. Gradients can
          be used as a fill or a background but not for strokes or borders. Anything else is ignored
          and the pen keeps its previous colour.
        </li>
      </ul>
      <Sample id="card-minimal" />
      <Sample id="card-pen" />
      <H3 id="gradients" title="Gradients" />
      <p>
        The angle is in degrees and follows the CSS convention: 0 points up, 90 points right. A name
        starts with a letter and has up to 32 letters, digits, <code>_</code> or <code>-</code>.
      </p>
      <Sample id="card-gradient" />

      <H2 id="charts" title="Charts" />
      <ul>
        <li>
          <code>card.languages(x, y, w, h)</code>: a stacked bar of <code>user.languages</code> (the
          top 8), each segment in the language&apos;s own colour, with rounded ends.
        </li>
        <li>
          <code>card.heatmap(x, y, cell, gap, weeks)</code>: the contribution calendar as a grid of
          squares, in the fill colour. Cell size is 2-24, gap 0-10 and weeks 1-53; it draws the last{" "}
          <code>weeks × 7</code> days of <code>user.days</code>. Empty days are faint and busier
          days are stronger, in four steps relative to the busiest day.
        </li>
        <li>
          <code>card.sparkline(x, y, w, h, values)</code>: a line through an array of numbers (at
          least two, up to 400) scaled to the box, in the stroke colour (2 px in the fill colour if
          no stroke is set).
        </li>
      </ul>
      <Sample id="card-charts" />
      <Callout kind="warn" title="Heatmap data">
        <p>
          Contribution data needs a GitHub token on the server. Without one, <code>user.days</code>{" "}
          is empty and the heatmap and sparkline draw nothing. See{" "}
          <Link href="/docs/card/api/#fallback">the API notes</Link>.
        </p>
      </Callout>

      <H2 id="motion" title="Motion" />
      <p>
        <code>card.animate(kind)</code> adds CSS animation inside the SVG. <code>.Fade</code> and{" "}
        <code>.Rise</code> bring each drawn element in one after another; <code>.Pulse</code>{" "}
        breathes them gently in a loop; <code>.Scan</code> sweeps a thin line down the card, in the
        fill colour that was current when you called it; <code>.None</code> turns it off. All of it
        is switched off for viewers who prefer reduced motion, and the animation lives in the image,
        so there is nothing to run on the page that shows it.
      </p>
      <Sample id="card-motion" />

      <H2 id="helpers" title="Helpers" />
      <p>
        Four helpers are written in Eitri inside the <code>card</code> module:
      </p>
      <table>
        <thead>
          <tr>
            <th>Call</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>card.compact(n)</code>
            </td>
            <td>
              <code>1234</code> becomes <code>&quot;1.2k&quot;</code>, <code>12345</code>{" "}
              <code>&quot;12k&quot;</code>, <code>3400000</code> <code>&quot;3.4M&quot;</code>;
              below 1000 the number as it is. It rounds down.
            </td>
          </tr>
          <tr>
            <td>
              <code>card.percent(share)</code>
            </td>
            <td>
              <code>0.734</code> becomes <code>&quot;73%&quot;</code>, clamped to 0-100.
            </td>
          </tr>
          <tr>
            <td>
              <code>card.clip(s, max)</code>
            </td>
            <td>
              At most <code>max</code> characters, ending in <code>...</code> when it was cut.
            </td>
          </tr>
          <tr>
            <td>
              <code>card.peak(values)</code>
            </td>
            <td>The largest value of an array of integers, or 0 for an empty one.</td>
          </tr>
        </tbody>
      </table>
      <Sample id="card-helpers" />
      <Sample id="card-params" />
      <Sample id="card-repos" />

      <H2 id="errors" title="Errors as images" />
      <p>
        A script that does not compile, or that faults while drawing, does not leave a broken image
        in a README. The report is drawn as a dark card with a red heading, up to 28 lines of 80
        characters, so you see the mistake where the card should be. The studio shows the same image
        in its preview, and the API serves it with status 200 and without caching, so a fix appears
        straight away.
      </p>
      <Diagnostic id="diag-card" />

      <H2 id="embedding" title="Embedding" />
      <p>
        The embed panel gives you three forms of the same URL. Replace the user and options as you
        like:
      </p>
      <ul>
        <li>
          <strong>URL:</strong> <code>{SITE}/api/card/&lt;user&gt;.svg?preset=classic</code>
        </li>
        <li>
          <strong>Markdown:</strong> <code>![GitHub card](&lt;url&gt;)</code>
        </li>
        <li>
          <strong>HTML:</strong>{" "}
          <code>&lt;img src=&quot;&lt;url&gt;&quot; alt=&quot;GitHub card&quot;&gt;</code>, with
          each <code>&amp;</code> in the URL written <code>&amp;amp;</code>
        </li>
      </ul>
      <H3 id="links" title="Presets, short links and long links" />
      <p>How the script reaches the server depends on the card:</p>
      <ul>
        <li>
          <strong>A preset</strong> is just <code>?preset=&lt;id&gt;</code>.
        </li>
        <li>
          <strong>A short link</strong>: <strong>Save · short link</strong> stores the script on the
          server (in Cloudflare KV) and the URL says <code>?script=&lt;id&gt;</code>, 11 characters.
          The id comes from the script&apos;s content, so saving the same script again gives the
          same id and a saved script can never be changed under a README. Scripts that do not
          compile are refused, and a script can be at most 16 KB.
        </li>
        <li>
          <strong>A long link</strong>: <code>?s=&lt;encoded&gt;</code> carries the whole script in
          the URL, compressed (deflate) and base64url encoded. It works anywhere without storing
          anything. It must fit in 6,144 characters; the studio says when a script is too long and
          suggests downloading the SVG instead.
        </li>
      </ul>
      <p>
        If the server has no KV storage (for example local development), saving answers that short
        links are not configured and the studio keeps the long link. Other parameters you set become{" "}
        <code>&amp;name=value</code> on every form. The full contract is in the{" "}
        <Link href="/docs/card/api/">HTTP API reference</Link>.
      </p>

      <H2 id="security" title="Security model" />
      <p>
        The SVG is served from this site&apos;s own origin and embedded in other people&apos;s
        READMEs, and the script behind a URL is written by whoever built the URL. So the script is
        never trusted; what it draws goes through a renderer that only emits what it knows:
      </p>
      <ul>
        <li>
          <strong>Text is escaped.</strong> Every string is XML-escaped, and characters XML cannot
          carry are dropped. Text is cut to 300 characters per call.
        </li>
        <li>
          <strong>Colours are validated</strong> against the grammar above, never copied through.
        </li>
        <li>
          <strong>Numbers are clamped</strong> to ranges, and positions to the card plus a 50 px
          margin.
        </li>
        <li>
          <strong>Tag and attribute names are fixed</strong> in the renderer, and ids are generated
          there. A script cannot add an element, an attribute, a style rule or a link.
        </li>
        <li>
          <strong>
            No scripts, no <code>foreignObject</code>, no external references.
          </strong>{" "}
          The only image is the avatar, and only as a <code>data:</code> URL of a PNG, JPEG, WebP or
          GIF: the server fetches it from <code>avatars.githubusercontent.com</code> over HTTPS,
          accepts up to 100 KB, and the renderer re-checks it. At most two avatars are drawn.
        </li>
        <li>
          <strong>Size caps.</strong> A render records at most 2,000 draw calls and the SVG has at
          most 3,000 elements and 600 KB. The script also runs under the usual{" "}
          <Link href="/docs/console/#limits">step, memory and size limits</Link>.
        </li>
        <li>
          <strong>Response headers.</strong> Cards are served with{" "}
          <code>
            content-security-policy: default-src &apos;none&apos;; style-src
            &apos;unsafe-inline&apos;; img-src data:
          </code>{" "}
          and <code>x-content-type-options: nosniff</code>, so even an unexpected SVG could load
          nothing and run nothing.
        </li>
        <li>
          <strong>Inputs are limited</strong>: logins are matched against GitHub&apos;s format,
          parameter names and values have length limits, and at most 16 parameters are accepted.
        </li>
      </ul>

      <Pager href="/docs/card/" />
    </>
  );
}
