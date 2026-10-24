import { readEnv } from "@/lib/server/env";
import { links } from "@/lib/links";

export function primusStatusBody(): Record<string, unknown> {
  const appId = readEnv("PRIMUS_APP_ID");
  const appSecret = readEnv("PRIMUS_APP_SECRET");
  const publicAppId = readEnv("NEXT_PUBLIC_PRIMUS_APP_ID");
  const missing = [
    ...(!appId ? ["PRIMUS_APP_ID"] : []),
    ...(!appSecret ? ["PRIMUS_APP_SECRET"] : []),
  ];
  const appIdMatches =
    appId && publicAppId ? appId === publicAppId : null;

  return {
    ready: missing.length === 0,
    missing,
    appIdMatches,
    message:
      missing.length === 0
        ? "Server signing credentials are set."
        : `Missing environment ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Get them from ${links.devHubProjects}.`,
  };
}
