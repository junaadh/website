import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs/DocsNav";
import { docsNav } from "@/lib/docs/nav";

export const metadata: Metadata = {
  title: { default: "Documentation", template: "%s — Docs" },
  description: "How to use the scriptable console and the card studio on this site.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 pt-10 pb-12 @4xl:grid-cols-[13rem_minmax(0,1fr)] @4xl:gap-12">
      <DocsNav groups={docsNav()} />
      <article className="prose-hud min-w-0">{children}</article>
    </div>
  );
}
