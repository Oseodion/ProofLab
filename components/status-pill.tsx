import { UI_STATUS_LABEL, type UiStatus } from "@/lib/verify-state";

const TONE: Record<UiStatus, string> = {
  pending: "border-pending/40 bg-pending/10 text-pending",
  verified: "border-verified/40 bg-verified/10 text-verified",
  unverified: "border-unverified/50 bg-unverified/10 text-unverified",
  failed: "border-failed/50 bg-failed/10 text-failed",
  unavailable: "border-unavailable/40 bg-unavailable/10 text-unavailable",
  done: "border-verified/40 bg-verified/10 text-verified",
};

export function StatusPill({ status }: { status: UiStatus }) {
  return (
    <span
      role="status"
      data-status={status}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs tracking-wide ${TONE[status]}`}
    >
      {UI_STATUS_LABEL[status]}
    </span>
  );
}
