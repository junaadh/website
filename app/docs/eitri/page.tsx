import type { Metadata } from "next";
import Link from "next/link";
import { Callout, DocHeader, H2, OnThisPage, Pager } from "@/components/docs/Doc";
import { Diagnostic, Sample } from "@/components/docs/Sample";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Docs: Eitri language",
  description: "A short tour of Eitri for JavaScript and TypeScript developers.",
  path: "/docs/eitri/",
  image: "/docs/opengraph-image",
});

export default function EitriDocs() {
  return (
    <>
      <DocHeader path="/docs/eitri" title="Eitri language">
        <p>
          Eitri is a statically typed scripting language for embedding in Rust. I am writing it; see{" "}
          <Link href="/work/eitri/">the project page</Link>. Here it is compiled to WebAssembly and
          runs in your browser. This is a short tour of what the console examples use, written for
          someone who knows JavaScript or TypeScript. It is not the whole language.
        </p>
      </DocHeader>

      <OnThisPage
        items={[
          { id: "differences", title: "At a glance" },
          { id: "imports", title: "Imports" },
          { id: "bindings", title: "let, var, functions, lambdas" },
          { id: "control", title: "Conditions and loops" },
          { id: "match", title: "Enums and match" },
          { id: "optionals", title: "Optionals" },
          { id: "arrays", title: "Strings and arrays" },
          { id: "structs", title: "Structs" },
          { id: "numbers", title: "Integers" },
          { id: "diagnostics", title: "Diagnostics" },
        ]}
      />

      <H2 id="differences" title="At a glance" />
      <table>
        <thead>
          <tr>
            <th>In TypeScript</th>
            <th>In Eitri</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>const x = 1</code>
            </td>
            <td>
              <code>let x = 1</code> (cannot be reassigned)
            </td>
          </tr>
          <tr>
            <td>
              <code>let x = 1</code>
            </td>
            <td>
              <code>var x = 1</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>function f(a: string): string {"{ … }"}</code>
            </td>
            <td>
              <code>fn f(a: string) -&gt; string {"{ … }"}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>e =&gt; {"{ … }"}</code>, <code>() =&gt; {"{ … }"}</code>
            </td>
            <td>the same</td>
          </tr>
          <tr>
            <td>
              <code>{"`hello ${name}`"}</code>
            </td>
            <td>
              <code>{'"hello ${name}"'}</code>: ordinary strings interpolate
            </td>
          </tr>
          <tr>
            <td>
              <code>a ? b : c</code>
            </td>
            <td>
              <code>if a {"{ b } else { c }"}</code>, an expression
            </td>
          </tr>
          <tr>
            <td>
              <code>switch</code>
            </td>
            <td>
              <code>match</code>, an expression, which must cover every case
            </td>
          </tr>
          <tr>
            <td>
              <code>for (const x of xs)</code>
            </td>
            <td>
              <code>for x in xs</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>for (let i = 0; i &lt; n; i++)</code>
            </td>
            <td>
              <code>for i in 0..n</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>xs.length</code>
            </td>
            <td>
              <code>xs.len()</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>string | null</code>, <code>x ?? y</code>
            </td>
            <td>
              <code>?string</code>, <code>x ?? y</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>interface</code> / object literal
            </td>
            <td>
              <code>struct</code> and <code>Name {"{ field: value }"}</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Beyond the syntax, the differences are that types are checked before anything runs, there
        are no semicolons (a newline ends a statement), numbers are integers (<code>i64</code>) or
        floats (<code>f64</code>) rather than one <code>number</code>, and there is no{" "}
        <code>undefined</code>.
      </p>

      <H2 id="imports" title="Imports" />
      <p>
        A script can only import the modules the host provides. Here those are the{" "}
        <Link href="/docs/sdk/">SDK modules</Link>. The name after <code>import</code> is what you
        call it in the script, and the string is the module path:
      </p>
      <p>
        <code>import site from &quot;site&quot;</code>,{" "}
        <code>import theme from &quot;site/theme&quot;</code>,{" "}
        <code>import card from &quot;card&quot;</code>. Members are used with a dot:{" "}
        <code>site.projects</code>, <code>theme.hue(195)</code>, <code>card.user</code>. A
        module&apos;s types are qualified the same way: <code>site.Action</code>,{" "}
        <code>theme.Weather</code>, <code>card.Icon</code>.
      </p>

      <H2 id="bindings" title="let, var, functions and lambdas" />
      <p>
        <code>let</code> binds a value that cannot be reassigned; <code>var</code> can be. Types are
        inferred and can be written after a colon. Functions use <code>fn</code>, name their
        parameter types, and give the return type after <code>-&gt;</code> (leave it out for no
        value). A lambda is <code>e =&gt; …</code> or <code>(a: i64) =&gt; …</code>; its body is a
        single expression or a block, and it can capture and change <code>var</code>s from the scope
        around it.
      </p>
      <Sample id="lang-basics" />

      <H2 id="control" title="Conditions and loops" />
      <p>
        <code>if</code> / <code>else if</code> / <code>else</code> is an expression, so it can be on
        the right of a <code>let</code>; every branch must give the same type. Conditions must be
        booleans (<code>if count</code> is an error; write <code>count != 0</code>). Loops are{" "}
        <code>while</code> and <code>for … in</code>, over an array or a range: <code>0..n</code>{" "}
        excludes <code>n</code>, <code>0..=n</code> includes it. There is also{" "}
        <code>for i, x in xs</code> for the index and the element.
      </p>
      <Sample id="lang-control" />

      <H2 id="match" title="Enums and match" />
      <p>
        An enum is a closed set of cases, such as <code>theme.Weather</code> with <code>Clear</code>
        , <code>Rain</code>, <code>Storm</code> and so on. When the compiler already knows the type
        you can write just the case with a leading dot, <code>.Rain</code>; elsewhere write{" "}
        <code>theme.Weather.Rain</code>. <code>match</code> picks an arm by case (or by value, for
        strings and numbers), and <code>_</code> matches everything else. A match that misses a case
        without <code>_</code> does not compile.
      </p>
      <Sample id="lang-match" />
      <Diagnostic id="diag-match" />

      <H2 id="optionals" title="Optionals" />
      <p>
        <code>?T</code> is a <code>T</code> or <code>null</code>. Event fields such as{" "}
        <code>e.slug</code> are optional because not every event has one. You cannot use an optional
        as a plain value: unwrap it with <code>if let name = e.section {"{ … }"}</code> (with an
        optional <code>else</code>), or give a fallback with <code>??</code>.
      </p>
      <Sample id="lang-optionals" />

      <H2 id="arrays" title="Strings and arrays" />
      <p>
        Strings use double quotes, and <code>{"${expression}"}</code> inside one inserts a value.
        Arrays are written <code>[1, 2, 3]</code> and typed <code>[]i64</code>. An empty array needs
        a type: <code>var names: []string = []</code>. The ones the examples use:
      </p>
      <ul>
        <li>
          <code>xs.len()</code>: the number of elements; <code>xs[i]</code>: the element at an
          index. An index outside the array is a runtime fault.
        </li>
        <li>
          <code>xs.push(x)</code> appends; <code>xs.insert(i, x)</code> inserts before index{" "}
          <code>i</code>.
        </li>
        <li>
          <code>xs.contains(x)</code>: whether an element equals <code>x</code>.
        </li>
        <li>
          Strings have <code>to_upper()</code> and, for the loop in <code>card.clip</code>,{" "}
          <code>chars()</code>.
        </li>
      </ul>
      <Sample id="lang-arrays" />

      <H2 id="structs" title="Structs" />
      <p>
        A struct is a record with named, typed fields. A literal starts with the struct&apos;s name
        and lists the fields as <code>name: value</code>. Structs that come from an SDK module are
        qualified by the module: <code>site.Action {"{ … }"}</code>, <code>ui.Pick {"{ … }"}</code>.
        In those, <strong>every field is required</strong>: there are no defaults, so leaving one
        out is a compile error. A struct can hold a lambda, which is how an action carries its{" "}
        <code>run</code> callback.
      </p>
      <Sample id="lang-structs" />
      <Diagnostic id="diag-missing-field" />

      <H2 id="numbers" title="Integers" />
      <p>
        Whole numbers are <code>i64</code> and decimals <code>f64</code>. The two do not mix
        implicitly; convert with <code>i64(x)</code> and <code>f64(x)</code>. Division of integers
        truncates. <code>+</code>, <code>-</code> and <code>*</code> on integers are{" "}
        <strong>checked</strong>: a result that does not fit in 64 bits is a runtime fault, never a
        silent wrap-around. (The wrapping forms <code>&amp;+</code>, <code>&amp;-</code> and{" "}
        <code>&amp;*</code> exist for when you want that.)
      </p>

      <H2 id="diagnostics" title="Diagnostics" />
      <p>
        When a script is rejected, the report names the error, the line and column, and underlines
        the code with carets. Runtime faults say where they happened and in which function (
        <code>&lt;module&gt;</code> is the top level of the script). In the console they appear in
        the Output tab; in the card studio the report is drawn as the card.
      </p>
      <Diagnostic id="diag-compile" />
      <Diagnostic id="diag-fault" />
      <Callout>
        <p>
          Every sample on these pages is run against the real runtime by the site&apos;s checks, so
          they are known to compile. Use <strong>Run in console</strong> on any of them to load it
          and try it.
        </p>
      </Callout>

      <Pager href="/docs/eitri/" />
    </>
  );
}
