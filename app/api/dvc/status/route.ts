import { dvcAvailability } from "@/lib/server/dvc";
import { bindRequest, readEnv } from "@/lib/server/env";
import { jsonNoStore } from "@/lib/server/http";

export async function GET() {
  await bindRequest();
  const result = dvcAvailability(readEnv("DVC_SERVICE_URL"));
  return jsonNoStore(result.body, result.status);
}
