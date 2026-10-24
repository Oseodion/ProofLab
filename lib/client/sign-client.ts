import type { SignCallResult } from "@/lib/client/run-attestation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function postSign(signParams: string): Promise<SignCallResult> {
  let response: Response;
  try {
    response = await fetch("/api/primus/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signParams }),
    });
  } catch {
    return { ok: false, message: "Could not reach /api/primus/sign." };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      message: `Sign request failed (${response.status}). The server did not return JSON.`,
    };
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `Sign request failed (${response.status}).`;
    return { ok: false, message };
  }

  if (!isRecord(payload) || typeof payload.signResult !== "string" || payload.signResult.length === 0) {
    return { ok: false, message: "Sign response did not include signResult." };
  }

  return { ok: true, signResult: payload.signResult };
}
