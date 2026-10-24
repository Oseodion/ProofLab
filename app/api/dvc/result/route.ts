import { fetchDvcResult } from "@/lib/server/dvc";
import { bindRequest, readEnv } from "@/lib/server/env";
import { jsonNoStore } from "@/lib/server/http";

export async function GET(request: Request) {
  await bindRequest();
  const taskId = new URL(request.url).searchParams.get("task_id") ?? "";
  const result = await fetchDvcResult(readEnv("DVC_SERVICE_URL"), taskId);
  return jsonNoStore(result.body, result.status);
}
