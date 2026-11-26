import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  turbopack: {
    // web-tree-sitter has a Node branch that imports these; the browser never
    // reaches it, so they resolve to an empty module there.
    resolveAlias: {
      "fs/promises": { browser: "./lib/eitri/empty.ts" },
      module: { browser: "./lib/eitri/empty.ts" },
    },
  },
};

export default config;
