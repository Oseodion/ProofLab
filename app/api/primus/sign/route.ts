import { bindRequest, readEnv } from "@/lib/server/env";
import { jsonNoStore, readJsonBody } from "@/lib/server/http";
import { signWithPrimus } from "@/lib/server/primus-sign";
import { processSignRequest } from "@/lib/server/sign-request";
import { SIGN_PARAMS_MAX } from "@/lib/validation";

export async function POST(request: Request) {
  await bindRequest();
  const body = await readJsonBody(request, SIGN_PARAMS_MAX + 2_048);
  if (!body.ok) {
    return jsonNoStore({ error: "invalid_request", message: body.message }, body.status);
  }

  const result = await processSignRequest(
    {
      appId: readEnv("PRIMUS_APP_ID"),
      appSecret: readEnv("PRIMUS_APP_SECRET"),
    },
    body.value,
    signWithPrimus,
  );

  return jsonNoStore(result.body, result.status);
}
