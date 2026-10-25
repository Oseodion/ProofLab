import { formatUnknownError, redactSecret } from "@/lib/format-error";

/**
 * Same sequence as production-example/server/index.js:
 * init(appId, appSecret) then sign(signParams).
 * signParams is the raw AttRequest JSON string.
 */
export async function signWithPrimus(
  appId: string,
  appSecret: string,
  signParams: string,
): Promise<string> {
  // Dynamic import on purpose. A static import is emitted as require() for this
  // ESM-only package and fails on the server with ERR_REQUIRE_ESM.
  const { PrimusZKTLS } = await import("@primuslabs/zktls-js-sdk");
  const primusZKTLS = new PrimusZKTLS();
  await primusZKTLS.init(appId, appSecret);
  const signResult = await primusZKTLS.sign(signParams);
  if (typeof signResult !== "string" || signResult.length === 0) {
    throw new Error("Primus sign() returned an empty result.");
  }
  return signResult;
}

export function publicSignError(error: unknown, secret: string): string {
  return redactSecret(formatUnknownError(error), secret);
}
