import type { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";

export async function createBrowserPrimus(): Promise<PrimusZKTLS> {
  const sdk = await import("@primuslabs/zktls-js-sdk");
  return new sdk.PrimusZKTLS();
}

export function publicPrimusAppId(): string {
  return process.env.NEXT_PUBLIC_PRIMUS_APP_ID?.trim() ?? "";
}
