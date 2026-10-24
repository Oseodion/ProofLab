import type { AlgorithmType } from "@/lib/validation";
import type { AttestationUiStatus, UiStatus } from "@/lib/verify-state";

export type AttestPhase = "idle" | "init" | "request" | "sign" | "attest" | "verify" | "done";

export type AttestationTask = {
  id: string;
  kind: "zktls-attestation";
  createdAt: string;
  updatedAt: string;
  templateId: string;
  userAddress: string;
  algorithmType: AlgorithmType;
  additionParams: string | null;
  status: AttestationUiStatus;
  verifyResult: boolean | null;
  error: string | null;
  attestation: unknown | null;
};

export type ComputeTask = {
  id: string;
  kind: "dvc-computation";
  createdAt: string;
  updatedAt: string;
  programId: string;
  serviceTaskId: string | null;
  status: Extract<UiStatus, "pending" | "failed" | "unavailable" | "done">;
  serviceStatus: string | null;
  error: string | null;
  response: unknown | null;
};

export type TaskRecord = AttestationTask | ComputeTask;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAttestationTask(value: unknown): value is AttestationTask {
  if (!isRecord(value) || value.kind !== "zktls-attestation") return false;
  return typeof value.id === "string" && typeof value.templateId === "string";
}

export function isComputeTask(value: unknown): value is ComputeTask {
  if (!isRecord(value) || value.kind !== "dvc-computation") return false;
  return typeof value.id === "string" && typeof value.programId === "string";
}

export function isTaskRecord(value: unknown): value is TaskRecord {
  return isAttestationTask(value) || isComputeTask(value);
}
