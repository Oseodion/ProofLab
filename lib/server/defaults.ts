import { bindRequest, readEnv } from "@/lib/server/env";
import { isUuid } from "@/lib/validation";

/**
 * Prefill only a real template UUID.
 * Blank values and non-UUID placeholders such as "MISSING" are unset.
 */
export function configuredTemplateId(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return isUuid(trimmed) ? trimmed : undefined;
}

export async function defaultTemplateId(): Promise<string> {
  await bindRequest();
  return (
    configuredTemplateId(readEnv("DEFAULT_ATT_TEMPLATE_ID")) ??
    configuredTemplateId(readEnv("NEXT_PUBLIC_DEFAULT_TEMPLATE_ID")) ??
    ""
  );
}
