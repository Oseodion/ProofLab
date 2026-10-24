"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AttestationResult } from "@/components/attestation-result";
import { PageShell } from "@/components/page-shell";
import { getTask, subscribeTasks } from "@/lib/history";
import { isAttestationTask, type TaskRecord } from "@/lib/types";

export function ResultView({ id }: { id: string }) {
  const found = useSyncExternalStore<TaskRecord | null | undefined>(
    subscribeTasks,
    () => getTask(id),
    () => undefined,
  );
  const task = found === undefined ? undefined : isAttestationTask(found) ? found : null;

  if (task === undefined) {
    return (
      <PageShell
        eyebrow="Result"
        title="Loading attestation"
        lede="Reading this browser’s local history."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell
        eyebrow="Result"
        title="No attestation stored for this id"
        lede="History lives in this browser. A task run on another device, or after storage was cleared, will not appear here."
      >
        <p className="break-all font-mono text-sm text-muted-foreground">{id}</p>
        <p className="mt-4 text-sm">
          <Link href="/history" className="text-primary underline-offset-4 hover:underline">
            Open history
          </Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="zkTLS attestation"
      title="Attestation result"
      lede="Metadata from the attestation returned by startAttestation, plus the boolean from verifyAttestation. This page does not describe a DVC computation proof."
    >
      <AttestationResult task={task} />
    </PageShell>
  );
}
