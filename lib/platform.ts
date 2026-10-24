export type PrimusPlatform = "pc" | "android" | "ios";

/** Matches production-example/client/src/primus.js (android, iphone, otherwise pc). */
export function detectPlatform(userAgent: string): PrimusPlatform {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone")) return "ios";
  return "pc";
}
