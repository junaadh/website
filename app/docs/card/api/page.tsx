import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Callout, DocHeader, H2, H3, OnThisPage, Pager } from "@/components/docs/Doc";
import { PRESETS } from "@/lib/card/presets";
import { profile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Card HTTP API",
  description:
    "GET /api/card/<login>.svg and .json, POST /api/card/scripts, caching, headers and errors.",
};

const SITE = profile.links.website;

export default function CardApiDocs() {
  return (
    <>
      <DocHeader path="/docs/card/api" title="HTTP API">
        <p>
          The card studio is a front end for three endpoints, served by Cloudflare Pages Functions
          from <code>{SITE}</code>. This page describes what they do, from the code. For the
          language the scripts are written in, see the <Link href="/docs/card/">card guide</Link>.
        </p>
      </DocHeader>

      <OnThisPage
        items={[
          { id: "endpoints", title: "Endpoints" },
          { id: "svg", title: "GET .svg" },
          { id: "json", title: "GET .json" },
          { id: "save", title: "POST /scripts" },
          { id: "caching", title: "Caching" },
          { id: "headers", title: "Headers" },
          { id: "status", title: "Status codes" },
          { id: "fallback", title: "Without a GitHub token" },
        ]}
      />

      <H2 id="endpoints" title="Endpoints" />
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>GET /api/card/&lt;login&gt;.svg</code>
            </td>
            <td>The card, as an SVG image.</td>
          </tr>
          <tr>
            <td>
              <code>GET /api/card/&lt;login&gt;.json</code>
            </td>
            <td>The profile data a script reads, as JSON. The studio draws locally from it.</td>
          </tr>
          <tr>
            <td>
              <code>POST /api/card/scripts</code>
            </td>
            <td>Saves a script and returns its id, for short links.</td>
          </tr>
        </tbody>
      </table>

      <H2 id="svg" title="GET /api/card/<login>.svg" />
      <p>
        <code>&lt;login&gt;</code> must be a GitHub username: letters, digits and hyphens, starting
        with a letter or digit, at most 39 characters. Anything else is a 400. The <code>.svg</code>{" "}
        extension is optional; without any extension you get the SVG.
      </p>
      <H3 id="query" title="Query parameters" />
      <p>The script comes from exactly one of these, checked in this order:</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>script</code>
            </td>
            <td className="!whitespace-normal">
              A saved script id (11 letters and digits, from <code>POST /api/card/scripts</code>).
              400 if it is not an id or nothing is saved under it.
            </td>
          </tr>
          <tr>
            <td>
              <code>s</code>
            </td>
            <td className="!whitespace-normal">
              A script carried in the URL, as the studio encodes it: deflate-compressed and
              base64url (leading <code>z</code>), or plain base64url (leading <code>p</code>). At
              most 6,144 characters, and 24 KB once decoded. 400 if it cannot be decoded.
            </td>
          </tr>
          <tr>
            <td>
              <code>preset</code>
            </td>
            <td className="!whitespace-normal">
              A built-in script. Default <code>classic</code>. An unknown id is a 400 that lists the
              valid ones: {PRESETS.map((p) => p.id).join(", ")}.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Every other parameter</strong> is handed to the script, which reads it with{" "}
        <code>card.param(name, fallback)</code>. <code>script</code>, <code>s</code> and{" "}
        <code>preset</code> are never passed on. The limits:
      </p>
      <ul>
        <li>at most 16 such parameters;</li>
        <li>
          names of 1 to 32 characters from <code>A-Z a-z 0-9 _ . -</code>;
        </li>
        <li>values of up to 100 characters;</li>
        <li>if a name is repeated, the first value is used.</li>
      </ul>
      <p>A request that breaks one of these is a 400 with a message saying which.</p>
      <CodeBlock
        language="text"
        label="Examples"
        code={`${SITE}/api/card/octocat.svg
${SITE}/api/card/octocat.svg?preset=terminal&accent=%23f0883e
${SITE}/api/card/octocat.svg?preset=classic&theme=light
${SITE}/api/card/octocat.svg?script=Kx9fQ2mZ7aB&theme=light`}
      />
      <p>
        A script that does not compile, or faults, still gets status 200: the body is the report
        drawn as an image (see <Link href="/docs/card/#errors">errors as images</Link>), so it shows
        in a README. It is not cached. Problems with the data or the request are not 200; see{" "}
        <a href="#status">status codes</a>.
      </p>

      <H2 id="json" title="GET /api/card/<login>.json" />
      <p>
        The profile the script sees, plus <code>avatar</code>, which is a <code>data:</code> URL (or
        an empty string) and is only used by <code>card.avatar</code>. Query parameters are ignored.
      </p>
      <CodeBlock
        language="text"
        label="Fields"
        code={`login, name, bio, location                      strings (name falls back to the login)
followers, following, repos, stars, forks         numbers
commits (this calendar year), pullRequests, issues, contributedTo   numbers (0 without a token)
joined                                            year the account was created
contributions                                     last 365 days
days                                              daily contributions, oldest first, up to 371
languages                                         up to 8 of { name, color, share }
top                                               up to 6 of { name, description, language, stars, forks }
avatar                                            data: URL or ""`}
      />
      <p>
        Responses carry <code>cache-control: public, max-age=3600</code> and an{" "}
        <code>x-card-source</code> header (<code>graphql</code> or <code>rest</code>) that tells you
        how complete the data is. Errors are JSON: <code>{'{ "error": "…" }'}</code>.
      </p>

      <H2 id="save" title="POST /api/card/scripts" />
      <p>
        Saves a script so an embed can say <code>?script=&lt;id&gt;</code> instead of carrying it.
        The body is the script text, sent as <code>text/plain</code>.
      </p>
      <CodeBlock
        language="text"
        label="Request"
        code={`curl -X POST ${SITE}/api/card/scripts \\
  -H 'content-type: text/plain' \\
  --data-binary @card.eit`}
      />
      <CodeBlock language="text" label="Response" code={`{ "id": "Kx9fQ2mZ7aB" }`} />
      <ul>
        <li>
          The id is 11 characters derived from the SHA-256 of the script. The same script always has
          the same id, and an id that exists is never overwritten.
        </li>
        <li>
          The script is compiled once against a sample profile. A script that does not compile is
          refused; one that compiles is stored even if it later faults for particular data.
        </li>
        <li>
          Scripts are stored in a Cloudflare KV namespace. Without one the endpoint answers 501.
        </li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>When</th>
            <th>Body</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>200</td>
            <td className="!whitespace-normal">Saved, or already saved.</td>
            <td>
              <code>{'{ "id" }'}</code>
            </td>
          </tr>
          <tr>
            <td>400</td>
            <td className="!whitespace-normal">The body is empty.</td>
            <td>
              <code>{'{ "error" }'}</code>
            </td>
          </tr>
          <tr>
            <td>413</td>
            <td className="!whitespace-normal">More than 16 KB (16,384 bytes).</td>
            <td>
              <code>{'{ "error" }'}</code>
            </td>
          </tr>
          <tr>
            <td>415</td>
            <td className="!whitespace-normal">
              The <code>content-type</code> does not start with <code>text/plain</code>.
            </td>
            <td>
              <code>{'{ "error" }'}</code>
            </td>
          </tr>
          <tr>
            <td>422</td>
            <td className="!whitespace-normal">The script does not compile.</td>
            <td>
              <code>{'{ "error", "report" }'}</code>, the report being the compiler&apos;s
              diagnostic
            </td>
          </tr>
          <tr>
            <td>501</td>
            <td className="!whitespace-normal">
              No KV namespace is bound (short links are not configured).
            </td>
            <td>
              <code>{'{ "error" }'}</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Every response from this endpoint is <code>cache-control: no-store</code>. The functions
        send no CORS headers, so the studio calls it from the same origin.
      </p>

      <H2 id="caching" title="Caching" />
      <ul>
        <li>
          <strong>GitHub data: 1 hour.</strong> Profile data is cached per login (case-insensitive)
          and refetched once it is an hour old.
        </li>
        <li>
          <strong>SVG: 1 hour, then stale while it refreshes.</strong> The response says{" "}
          <code>public, max-age=3600, stale-while-revalidate=86400</code>. On the server a good card
          is kept for a day; after the first hour it is still served at once while a new one is
          drawn in the background. The cache key is the login and the query with its parameters
          sorted, so the same card is one entry whatever order the parameters came in.
        </li>
        <li>
          <strong>Errors are never cached.</strong> Every error response, including the image for a
          script with a mistake, says <code>no-store</code> and is not kept on the server.
        </li>
      </ul>

      <H2 id="headers" title="Headers" />
      <table>
        <thead>
          <tr>
            <th>Header</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>content-type</code>
            </td>
            <td className="!whitespace-normal">
              <code>image/svg+xml; charset=utf-8</code> (<code>application/json</code> for{" "}
              <code>.json</code> and the scripts endpoint)
            </td>
          </tr>
          <tr>
            <td>
              <code>content-security-policy</code>
            </td>
            <td className="!whitespace-normal">
              <code>
                default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; img-src data:
              </code>{" "}
              on every SVG, errors included
            </td>
          </tr>
          <tr>
            <td>
              <code>x-content-type-options</code>
            </td>
            <td>
              <code>nosniff</code> on every SVG
            </td>
          </tr>
          <tr>
            <td>
              <code>cache-control</code>
            </td>
            <td className="!whitespace-normal">
              As in <a href="#caching">caching</a>:{" "}
              <code>public, max-age=3600, stale-while-revalidate=86400</code> for a card,{" "}
              <code>public, max-age=3600</code> for <code>.json</code>, <code>no-store</code> for
              errors
            </td>
          </tr>
          <tr>
            <td>
              <code>x-card-source</code>
            </td>
            <td className="!whitespace-normal">
              <code>graphql</code> when the data came from GitHub&apos;s GraphQL API with a token,{" "}
              <code>rest</code> for the fallback
            </td>
          </tr>
          <tr>
            <td>
              <code>x-card-note</code>
            </td>
            <td className="!whitespace-normal">
              Only with <code>rest</code>:{" "}
              <em>no GITHUB_TOKEN: REST fallback, contributions and heatmap are empty</em>
            </td>
          </tr>
        </tbody>
      </table>

      <H2 id="status" title="Status codes" />
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>200</td>
            <td className="!whitespace-normal">
              A card, or the diagnostic image for a script that does not compile or faults.
            </td>
          </tr>
          <tr>
            <td>400</td>
            <td className="!whitespace-normal">
              Invalid username; too many, badly named or too long parameters; unknown preset;{" "}
              <code>script</code> that is not an id or is not saved; <code>s</code> that is too long
              or cannot be decoded.
            </td>
          </tr>
          <tr>
            <td>404</td>
            <td className="!whitespace-normal">GitHub has no such user.</td>
          </tr>
          <tr>
            <td>500</td>
            <td className="!whitespace-normal">
              The card could not be rendered (an unexpected error).
            </td>
          </tr>
          <tr>
            <td>502</td>
            <td className="!whitespace-normal">
              GitHub failed or refused: an error status, a rejected token, an unanswerable query or
              the anonymous rate limit.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Error bodies match the request: an SVG error card (headed <em>{"eitri // card api"}</em>)
        for <code>.svg</code> requests so it is visible in a README, and{" "}
        <code>{'{ "error": "…" }'}</code> for <code>.json</code>.
      </p>

      <H2 id="fallback" title="Without a GitHub token" />
      <p>
        With a <code>GITHUB_TOKEN</code> secret on the server the data comes from GitHub&apos;s
        GraphQL API: only public data is requested, private repositories are never counted, and
        contributions come from the public calendar. Without one, the API falls back to
        GitHub&apos;s anonymous REST API and the data has gaps. The response says which with{" "}
        <code>x-card-source</code>.
      </p>
      <ul>
        <li>
          <code>commits</code>, <code>pullRequests</code>, <code>issues</code>,{" "}
          <code>contributedTo</code> and <code>contributions</code> are <strong>0</strong>, and{" "}
          <code>days</code> is <strong>empty</strong>, so a heatmap or sparkline draws nothing.
        </li>
        <li>
          <code>languages</code> come from each repository&apos;s main language, weighted by the
          repository&apos;s size, with built-in colours for common languages (grey for the rest),
          instead of per-language byte counts.
        </li>
        <li>
          Only the 100 most recently pushed repositories the user owns are looked at, minus forks.
          GitHub&apos;s anonymous rate limit is low; when it is hit the card answers 502 until the
          limit resets.
        </li>
      </ul>
      <Callout>
        <p>
          The studio shows <em>Basic profile only</em> under the preview when the server is using
          the fallback.
        </p>
      </Callout>

      <Pager href="/docs/card/api/" />
    </>
  );
}
