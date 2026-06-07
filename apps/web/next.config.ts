import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

// The @quorum/* workspace packages ship raw TypeScript source (`main: src/index.ts`)
// and use ESM `.js` import specifiers that actually point at `.ts` files. Next's
// bundler must be told to resolve `.js` specifiers to `.ts` sources, and to
// transpile these workspace packages.
const nextConfig: NextConfig = {
  transpilePackages: ["@quorum/shared", "@quorum/slack", "@quorum/workflows"],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  turbopack: {
    resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".mjs"],
  },
};

export default withWorkflow(nextConfig);
