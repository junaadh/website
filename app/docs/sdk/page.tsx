import type { Metadata } from "next";
import Link from "next/link";
import { Callout, DocHeader, H2, Pager } from "@/components/docs/Doc";
import { sdkModules } from "@/lib/docs/sdk";

export const metadata: Metadata = {
  title: "SDK reference",
  description:
    "Every module, function and type a script can use, generated from the declaration files.",
};

export default function SdkIndex() {
  const modules = sdkModules();
  return (
    <>
      <DocHeader path="/docs/sdk" title="SDK reference">
        <p>
          The functions and types a script can import. This reference is generated when the site is
          built from the declaration files (<code>.eith</code>) in <code>/eitri/sdk/</code>, the
          same files the console&apos;s Docs tab shows, so it always matches what the console
          offers.
        </p>
      </DocHeader>

      <H2 id="modules" title="Modules" />
      <table className="wide">
        <thead>
          <tr>
            <th>Import</th>
            <th>What it is for</th>
            <th>Functions</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.path}>
              <td>
                <Link href={`/docs/sdk/${m.slug}/`} className="font-mono text-xs">
                  {m.path}
                </Link>
              </td>
              <td className="!whitespace-normal">{m.info.summary}</td>
              <td>{m.functions.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <code>site</code> and its submodules are for scripts in the console. <code>card</code> is
        for scripts in the <Link href="/docs/card/">card studio</Link> and the card API; the two
        runtimes do not share modules.
      </p>

      <H2 id="reading" title="Reading a declaration" />
      <ul>
        <li>
          <code>pub fn name(a: T) -&gt; R</code> is a function with typed parameters and a return
          type. Most of the SDK returns <code>void</code>: calling it asks the page to do something.
        </li>
        <li>
          <code>[]T</code> is an array of <code>T</code>; <code>?T</code> is a <code>T</code> or{" "}
          <code>null</code>; <code>fn(A) -&gt; R</code> is a function value, which you pass as a
          lambda.
        </li>
        <li>
          <code>pub struct</code> is a record you build with{" "}
          <code>module.Name {"{ field: value }"}</code>; every field is required.{" "}
          <code>pub enum</code> lists the cases you write as <code>.Case</code>.
        </li>
        <li>
          <code>pub let name: T</code> is a value the host provides, such as{" "}
          <code>site.projects</code>.
        </li>
        <li>
          A function marked <em>written in Eitri</em> (a few in <code>card</code>) has a body in the
          file, not in the host; only its signature is shown here.
        </li>
      </ul>

      <H2 id="effects" title="How calls reach the page" />
      <p>
        A call such as <code>theme.hue(150)</code> does not change the page by itself. The runtime
        records it, and when the script (or a callback) finishes without a fault, the site applies
        all the recorded calls together, clamping every value to its range. A script that faults
        part-way through its top level changes nothing. The numbers each module accepts, and the
        limits on counts and lengths, are listed on its page.
      </p>
      <Callout>
        <p>
          Values read from the page, such as <code>site.projects</code> and <code>site.time</code>,
          are fixed when the script or callback starts. <code>site.time</code> is Maldives time
          (UTC+5).
        </p>
      </Callout>

      <Pager href="/docs/sdk/" />
    </>
  );
}
