import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Crawlers get complete metadata in the initial HTML, without executing React.
function socialHead() {
  const p = JSON.parse(
    readFileSync(new URL("./src/data/profile.json", import.meta.url), "utf8"),
  );
  const card = JSON.parse(
    readFileSync(
      new URL("./public/generated/social.json", import.meta.url),
      "utf8",
    ),
  );
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const meta = (attribute: string, key: string, value: string) =>
    `<meta ${attribute}="${key}" content="${escape(value)}" />`;
  const image = new URL(card.path, p.website).href;
  const current = p.experience.find((job: { current: boolean }) => job.current);
  return [
    `<title>${escape(p.social.title)}</title>`,
    meta("name", "author", p.name),
    meta("name", "description", p.social.description),
    `<link rel="canonical" href="${escape(p.website)}/" />`,
    ...Object.entries({
      "og:type": "website",
      "og:url": `${p.website}/`,
      "og:title": p.social.title,
      "og:description": p.social.description,
      "og:site_name": p.name,
      "og:locale": "en_US",
      "og:image": image,
      "og:image:secure_url": image,
      "og:image:type": "image/png",
      "og:image:width": String(card.width),
      "og:image:height": String(card.height),
      "og:image:alt": p.social.imageAlt,
    }).map(([key, value]) => meta("property", key, value as string)),
    ...Object.entries({
      "twitter:card": "summary_large_image",
      "twitter:site": `@${p.handle}`,
      "twitter:creator": `@${p.handle}`,
      "twitter:title": p.social.title,
      "twitter:description": p.social.description,
      "twitter:image": image,
      "twitter:image:alt": p.social.imageAlt,
    }).map(([key, value]) => meta("name", key, value as string)),
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name: p.name, url: p.website, jobTitle: p.title, ...(current ? { worksFor: { "@type": "Organization", name: current.company } } : {}), sameAs: [p.github, `https://x.com/${p.handle}`], knowsAbout: p.skills.flatMap((s: { items: string[] }) => s.items) }).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}
export default defineConfig({
  // Two entries: the public site, and the authenticated panel. Keeping them
  // separate means the ~240 kB public bundle never carries the editor.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "portfolio-social-head",
      transformIndexHtml(html) {
        return html.replace("<!-- social-head -->", socialHead());
      },
    },
  ],
});
