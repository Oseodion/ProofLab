import type { DvcMaterial } from "@/lib/dvc-document";

const PREFIX = "prooflab.dvc-private.";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Private DVC fields (aes_key, plain JSON) stay in this tab’s sessionStorage.
 * They are not written to the localStorage history record the result page prints.
 */
export function saveDvcMaterial(taskId: string, material: DvcMaterial): "session" | "none" {
  const store = storage();
  if (!store) return "none";
  try {
    store.setItem(`${PREFIX}${taskId}`, JSON.stringify(material));
    return "session";
  } catch {
    return "none";
  }
}

export function loadDvcMaterial(taskId: string): DvcMaterial | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(`${PREFIX}${taskId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.requestId !== "string") return null;
    return {
      requestId: record.requestId,
      allJsonResponse: record.allJsonResponse ?? null,
      privateData: record.privateData ?? null,
    };
  } catch {
    return null;
  }
}
