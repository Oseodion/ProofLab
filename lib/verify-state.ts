export type AttestationUiStatus = "pending" | "verified" | "unverified" | "failed";

export type UiStatus = AttestationUiStatus | "unavailable" | "done";

export const UI_STATUS_LABEL: Record<UiStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  unverified: "Unverified",
  failed: "Failed",
  unavailable: "Unavailable",
  done: "Done",
};

/**
 * verifyAttestation returns a boolean. Only a strict true is verified.
 * false, and any other runtime value, stays unverified.
 */
export function statusFromVerifyResult(result: unknown): "verified" | "unverified" {
  return result === true ? "verified" : "unverified";
}

export function dvcStatusFromPayload(
  httpOk: boolean,
  payload: unknown,
): "pending" | "failed" | "done" {
  if (!httpOk) return "failed";
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "pending";
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && typeof record.status !== "string") {
    return "failed";
  }
  switch (record.status) {
    case "queued":
    case "running":
    case "paused":
      return "pending";
    case "done":
      return "done";
    case "error":
      return "failed";
    default:
      return "pending";
  }
}
