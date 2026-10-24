import { bindRequest } from "@/lib/server/env";
import { jsonNoStore } from "@/lib/server/http";
import { primusStatusBody } from "@/lib/server/primus-status";

export async function GET() {
  await bindRequest();
  return jsonNoStore(primusStatusBody());
}
