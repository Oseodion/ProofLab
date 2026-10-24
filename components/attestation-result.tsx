import { JsonBlock } from "@/components/json-block";
import { StatusPill } from "@/components/status-pill";
import { summarizeAttestation } from "@/lib/attestation-summary";
import type { AttestationTask } from "@/lib/types";

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString()} (${date.toLocaleString()})`;
}

export function AttestationResult({ task }: { task: AttestationTask }) {
  const rows = summarizeAttestation(task.attestation);

  return (
    <article className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={task.status} />
        <p className="font-mono text-xs text-muted-foreground">zkTLS attestation</p>
      </div>

      {task.verifyResult === true ? (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          verifyAttestation returned true. The signature matches the attestor address configured in
          @primuslabs/zktls-js-sdk. This record is a zkTLS attestation.
        </p>
      ) : null}
      {task.verifyResult === false ? (
        <p className="max-w-2xl text-sm leading-6 text-foreground">
          verifyAttestation returned false. This record is unverified.
        </p>
      ) : null}
      {task.status === "failed" ? (
        <p className="max-w-2xl text-sm leading-6 text-foreground">
          {task.error ?? "The flow stopped before a verification result."}
        </p>
      ) : null}
      {task.status === "pending" ? (
        <p className="text-sm text-muted-foreground">verifyAttestation has not finished.</p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Created</dt>
          <dd className="mt-1 font-mono text-sm">{formatStamp(task.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Updated</dt>
          <dd className="mt-1 font-mono text-sm">{formatStamp(task.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Template ID</dt>
          <dd className="mt-1 break-all font-mono text-sm">{task.templateId}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">User address</dt>
          <dd className="mt-1 break-all font-mono text-sm">{task.userAddress}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">TLS mode</dt>
          <dd className="mt-1 font-mono text-sm">{task.algorithmType}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">verifyAttestation</dt>
          <dd className="mt-1 font-mono text-sm">
            {task.verifyResult === null ? "not run" : String(task.verifyResult)}
          </dd>
        </div>
      </dl>

      {rows.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium">Attestation metadata</h2>
          <dl className="mt-3 divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="break-all font-mono text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No attestation object was stored for this task.
        </p>
      )}

      {task.attestation !== null ? (
        <JsonBlock value={task.attestation} label="Attestation JSON" />
      ) : null}
    </article>
  );
}
