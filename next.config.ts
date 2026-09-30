import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "lokijs",
    "encoding",
    "@base-org/account",
    "@coinbase/cdp-sdk",
  ],
  turbopack: {},
};

export default nextConfig;
