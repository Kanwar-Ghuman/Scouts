import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snowflake-sdk"],
  // Ship the offline data files with the API functions on Vercel
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
