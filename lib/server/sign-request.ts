import { links } from "@/lib/links";
import { publicSignError } from "@/lib/server/primus-sign";
import { parseSignBody } from "@/lib/validation";

export type SignEnv = {
  appId?: string;
  appSecret?: string;
};

export type SignHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function processSignRequest(
  env: SignEnv,
  body: unknown,
  sign: (appId: string, appSecret: string, signParams: string) => Promise<string>,
): Promise<SignHandlerResult> {
  const missing = [
    ...(!env.appId ? ["PRIMUS_APP_ID"] : []),
    ...(!env.appSecret ? ["PRIMUS_APP_SECRET"] : []),
  ];

  if (missing.length > 0 || !env.appId || !env.appSecret) {
    const noun = missing.length === 1 ? "variable" : "variables";
    return {
      status: 503,
      body: {
        error: "missing_credentials",
        missing,
        message: `Server signing is unavailable. Missing environment ${noun}: ${missing.join(", ")}. Create a project at ${links.devHubProjects} and set those variables on the server. The App Secret is never sent to the browser.`,
      },
    };
  }

  const parsed = parseSignBody(body, env.appId);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid_request", message: parsed.message } };
  }

  try {
    const signResult = await sign(env.appId, env.appSecret, parsed.value);
    return { status: 200, body: { signResult } };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: "sign_failed",
        message: `Primus sign() failed. ${publicSignError(error, env.appSecret)} Confirm PRIMUS_APP_ID and PRIMUS_APP_SECRET from Dev Hub belong to the same project.`,
      },
    };
  }
}
