import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The dev RSC client closes a payload only after both the flight stream and
    // the React debug channel finish. The channel closes when the HMR socket
    // sends a null chunk. A failed socket leaves every page unhydrated, so
    // forms fall through to a native GET and status stays at the SSR default.
    reactDebugChannel: false,
  },
  // @primuslabs/zktls-js-sdk is ESM-only. serverExternalPackages loads opted-out
  // packages with Node require(), which throws ERR_REQUIRE_ESM on Vercel.
  // Bundle the SDK (and @solana/web3.js, whose CJS build require()s ESM uuid).
  // ethers is CJS and stays external for sign().
  serverExternalPackages: ["ethers"],
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
