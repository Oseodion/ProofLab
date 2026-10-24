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
  // Keep the SDK on Node's resolver in Route Handlers. sign() uses ethers and must not be bundled into the client by the server compile.
  serverExternalPackages: ["@primuslabs/zktls-js-sdk"],
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
