import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocHeader, H2, H3, OnThisPage, Pager } from "@/components/docs/Doc";
import { Sample } from "@/components/docs/Sample";
import { Signature, TypeText } from "@/components/docs/Signature";
import { docBlocks, docText } from "@/lib/docs/eith";
import { type SdkModule, sdkModule, sdkModules } from "@/lib/docs/sdk";

export const dynamicParams = false;
export const generateStaticParams = () => sdkModules().map((m) => ({ module: m.slug }));

type Props = { params: Promise<{ module: string }> };

/** "site/theme: the look. More." -> "The look. More." */
const lead = (m: SdkModule) => {
  const first = (m.intro[0] ?? "").replace(/^[\w/]+:\s*/, "");
  return [first.charAt(0).toUpperCase() + first.slice(1), ...m.intro.slice(1)];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = sdkModule((await params).module);
  return m ? { title: `${m.path} (SDK)`, description: m.info.summary } : {};
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default async function SdkModulePage({ params }: Props) {
  const m = sdkModule((await params).module);
  if (!m) notFound();

  const types = new Set([...m.structs.map((s) => s.name), ...m.enums.map((e) => e.name)]);
  const blocks = docBlocks(lead(m));
  const intro = blocks.slice(1);
  const groups = [...new Set(m.functions.map((f) => f.group))];
  const hasTypes = m.structs.length + m.enums.length > 0;

  const outline = [
    ...(m.values.length ? [{ id: "values", title: "Values" }] : []),
    ...(m.functions.length ? [{ id: "functions", title: "Functions" }] : []),
    ...(hasTypes ? [{ id: "types", title: "Types" }] : []),
    ...(m.info.samples.length ? [{ id: "examples", title: "Examples" }] : []),
    { id: "limits", title: "Limits" },
    { id: "declaration", title: "Declaration file" },
  ].filter((i) => i.id !== "limits" || m.info.limits.length > 0);

  return (
    <>
      <DocHeader tag="SDK" path={`/docs/sdk/${m.slug}`} title={m.path}>
        <p>{blocks[0]?.text}</p>
      </DocHeader>

      <CodeBlock code={`import ${m.alias} from "${m.path}"`} label="import" />
      {intro.map((b) =>
        b.kind === "p" ? (
          <p key={b.text}>{b.text}</p>
        ) : (
          <CodeBlock key={b.text} code={b.text} label="note" language="text" />
        ),
      )}

      <OnThisPage items={outline} />

      {m.values.length > 0 && (
        <>
          <H2 id="values" title="Values" />
          <table className="sig wide">
            <thead>
              <tr>
                <th>Value</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {m.values.map((v) => (
                <tr key={v.name} id={`let-${v.name}`}>
                  <td>
                    <code className="!border-0 !bg-transparent !p-0 !text-xs">
                      <span className="tk-kw">let</span> <span className="tk-fn">{v.name}</span>
                      <span className="tk-punct">: </span>
                      <TypeText text={v.type} types={types} />
                    </code>
                  </td>
                  <td>{docText(v.doc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {m.functions.length > 0 && (
        <>
          <H2 id="functions" title="Functions" />
          {groups.map((g) => (
            <div key={g || "all"}>
              {g && <H3 id={`group-${slugify(g)}`} title={g} />}
              <table className="sig wide">
                <thead>
                  <tr>
                    <th>Signature</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {m.functions
                    .filter((f) => f.group === g)
                    .map((f) => (
                      <tr key={f.name} id={`fn-${f.name}`}>
                        <td>
                          <Signature
                            name={f.name}
                            params={f.params}
                            returns={f.returns}
                            types={types}
                            href={`#fn-${f.name}`}
                          />
                        </td>
                        <td>
                          {docText(f.doc)}
                          {f.helper && <span className="label ml-2 text-ok">written in Eitri</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {hasTypes && (
        <>
          <H2 id="types" title="Types" />
          {m.enums.map((e) => (
            <div key={e.name} id={`type-${e.name}`} className="mb-6 scroll-mt-20">
              <H3 id={`enum-${e.name}`} title={`enum ${e.name}`} />
              {e.doc.length > 0 && <p>{docText(e.doc)}</p>}
              <p className="flex flex-wrap gap-2">
                {e.cases.map((c) => (
                  <code key={c}>.{c}</code>
                ))}
              </p>
            </div>
          ))}
          {m.structs.map((s) => (
            <div key={s.name} id={`type-${s.name}`} className="scroll-mt-20">
              <H3 id={`struct-${s.name}`} title={`struct ${s.name}`} />
              {docBlocks(s.doc).map((b) =>
                b.kind === "p" ? (
                  <p key={b.text}>{b.text}</p>
                ) : (
                  <CodeBlock key={b.text} code={b.text} label="note" language="text" />
                ),
              )}
              <table className="sig wide">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {s.fields.map((f) => (
                    <tr key={f.name}>
                      <td>
                        <code>{f.name}</code>
                      </td>
                      <td>
                        <code className="!border-0 !bg-transparent !p-0 !text-xs">
                          <TypeText text={f.type} types={types} />
                        </code>
                      </td>
                      <td>{docText(f.doc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {m.info.samples.length > 0 && (
        <>
          <H2 id="examples" title="Examples" />
          {m.info.samples.map((id) => (
            <Sample key={id} id={id} />
          ))}
        </>
      )}

      {m.info.limits.length > 0 && (
        <>
          <H2 id="limits" title="Limits" />
          <ul>
            {m.info.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}

      <H2 id="declaration" title="Declaration file" />
      <p>
        This page is generated from the file below, served as{" "}
        <a href={`/eitri/sdk/${m.file}`}>
          <code>/eitri/sdk/{m.file}</code>
        </a>
        . Types and signatures are exactly what the compiler checks scripts against. Back to{" "}
        <Link href="/docs/sdk/">all modules</Link>.
      </p>
      <CodeBlock code={m.source.trimEnd()} label={m.file} />

      <Pager href={`/docs/sdk/${m.slug}/`} />
    </>
  );
}
