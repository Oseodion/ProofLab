import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Primus SDK server load", () => {
  it("does not opt the ESM SDK into serverExternalPackages", () => {
    const external = nextConfig.serverExternalPackages ?? [];
    expect(external).not.toContain("@primuslabs/zktls-js-sdk");
  });

  it("loads the SDK from the sign helper with dynamic import, not require", () => {
    const source = readFileSync("lib/server/primus-sign.ts", "utf8");
    expect(source).toContain('await import("@primuslabs/zktls-js-sdk")');
    expect(source).not.toMatch(/require\(["']@primuslabs\/zktls-js-sdk["']\)/);
    expect(source).not.toMatch(/^import\s+(?!type\b).*@primuslabs\/zktls-js-sdk/m);
  });
});
