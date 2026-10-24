import { bindRequest, readEnv } from "@/lib/server/env";

export async function defaultTemplateId(): Promise<string> {
  await bindRequest();
  return readEnv("DEFAULT_ATT_TEMPLATE_ID") ?? readEnv("NEXT_PUBLIC_DEFAULT_TEMPLATE_ID") ?? "";
}
