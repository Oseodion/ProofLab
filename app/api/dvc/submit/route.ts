import { submitToDvc } from "@/lib/server/dvc";
import { bindRequest, readEnv } from "@/lib/server/env";
import { jsonNoStore, readJsonBody } from "@/lib/server/http";
import { ATTESTATION_DATA_MAX } from "@/lib/validation";

export async function POST(request: Request) {
  await bindRequest();
  const body = await readJsonBody(request, ATTESTATION_DATA_MAX + 4_096);
  if (!body.ok) {
    return jsonNoStore({ error: "invalid_request", message: body.message }, body.status);
  }

  const result = await submitToDvc(readEnv("DVC_SERVICE_URL"), body.value);
  return jsonNoStore(result.body, result.status);
}
