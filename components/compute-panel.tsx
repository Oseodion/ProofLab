"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Callout } from "@/components/callout";
import { JsonBlock } from "@/components/json-block";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTask } from "@/lib/history";
import type { ComputeTask } from "@/lib/types";
import { dvcStatusFromPayload, type UiStatus } from "@/lib/verify-state";

export type Availability = {
  configured?: boolean;
  missing?: string[];
  invalid?: boolean;
  message?: string;
};

type SubmitBody = {
  ok?: boolean;
  error?: string;
  message?: string;
  missing?: string[];
  upstreamStatus?: number;
  payload?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTaskId(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.task_id !== "string") return null;
  return payload.task_id;
}

function readServiceStatus(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.status !== "string") return null;
  return payload.status;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function ComputePanel({ initialAvailability }: { initialAvailability: Availability }) {
  const [availability, setAvailability] = useState<Availability | null>(initialAvailability);
  const [programId, setProgramId] = useState("");
  const [attestationData, setAttestationData] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<UiStatus>("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<unknown>(null);
  const [serviceTaskId, setServiceTaskId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const localIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dvc/status");
        const body = (await res.json()) as Availability;
        if (!cancelled) setAvailability(body);
      } catch {
        // The server snapshot stays. A failed status refresh does not invent a new state.
      }
    }
    void load();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  const configured = availability?.configured === true;
  const missingEnv = availability?.missing?.includes("DVC_SERVICE_URL") ?? false;

  function remember(task: Omit<ComputeTask, "id" | "createdAt"> & { id?: string }): void {
    const id = localIdRef.current ?? task.id ?? crypto.randomUUID();
    localIdRef.current = id;
    const createdAt = createdAtRef.current ?? new Date().toISOString();
    createdAtRef.current = createdAt;
    saveTask({ ...task, id, createdAt });
  }

  async function poll(taskId: string, program: string, signal: AbortSignal) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (signal.aborted) return;
      const res = await fetch(`/api/dvc/result?task_id=${encodeURIComponent(taskId)}`, { signal });
      const body = (await res.json()) as SubmitBody;
      if (signal.aborted) return;
      const payload = body.payload ?? body;
      const httpOk = body.ok === true || (body.ok === undefined && res.ok);
      const next = dvcStatusFromPayload(httpOk, payload);
      const serviceStatus = readServiceStatus(payload);
      setResponse(body);
      setStatus(next);
      setMessage(
        next === "done"
          ? "The DVC service reported status done. ProofLab did not verify the SNARK."
          : serviceStatus
            ? `DVC service status: ${serviceStatus}.`
            : null,
      );
      remember({
        kind: "dvc-computation",
        updatedAt: new Date().toISOString(),
        programId: program,
        serviceTaskId: taskId,
        status: next === "pending" ? "pending" : next,
        serviceStatus,
        error: next === "failed" && isRecord(payload) && typeof payload.error === "string" ? payload.error : null,
        response: body,
      });
      if (next === "done" || next === "failed") return;
      await sleep(4000, signal);
    }
    setMessage("Still queued or running. Poll again. ProofLab will not mark this done until the service says so.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setStatus("pending");
    setMessage("Submitting program_id and attestation_data to /submitTask.");
    setResponse(null);
    setServiceTaskId(null);

    localIdRef.current = crypto.randomUUID();
    createdAtRef.current = new Date().toISOString();
    try {
      const res = await fetch("/api/dvc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_id: programId.trim(), attestation_data: attestationData }),
        signal: controller.signal,
      });
      const body = (await res.json()) as SubmitBody;
      setResponse(body);

      if (body.missing?.includes("DVC_SERVICE_URL")) {
        setStatus("unavailable");
        setMessage(body.message ?? "Missing environment variable: DVC_SERVICE_URL.");
        return;
      }

      if (!res.ok || body.ok === false) {
        setStatus("failed");
        setMessage(body.message ?? "The DVC service rejected the submit.");
        remember({
          kind: "dvc-computation",
          updatedAt: new Date().toISOString(),
          programId: programId.trim(),
          serviceTaskId: null,
          status: "failed",
          serviceStatus: null,
          error: body.message ?? "submit failed",
          response: body,
        });
        return;
      }

      const taskId = readTaskId(body.payload);
      const serviceStatus = readServiceStatus(body.payload);
      const next = dvcStatusFromPayload(true, body.payload);
      setServiceTaskId(taskId);
      setStatus(next);
      setMessage(
        taskId
          ? `Service accepted the task ${taskId} with status ${serviceStatus ?? "unknown"}. Polling getResult.`
          : "The service response did not include a task_id. ProofLab will not invent one.",
      );
      remember({
        kind: "dvc-computation",
        updatedAt: new Date().toISOString(),
        programId: programId.trim(),
        serviceTaskId: taskId,
        status: next,
        serviceStatus,
        error: null,
        response: body,
      });
      if (taskId && next === "pending") {
        await poll(taskId, programId.trim(), controller.signal);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  }

  const configStatus: UiStatus | "ready" = !availability
    ? "pending"
    : missingEnv
      ? "unavailable"
      : availability.invalid
        ? "failed"
        : "ready";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {configStatus === "ready" ? (
          <span className="font-mono text-xs text-muted-foreground">DVC_SERVICE_URL is set</span>
        ) : (
          <StatusPill status={configStatus} />
        )}
        <p className="text-sm text-muted-foreground">DVC service configuration</p>
      </div>
      {response !== null || busy ? (
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={status} />
          <p className="text-sm text-muted-foreground">Latest submit</p>
        </div>
      ) : null}

      {missingEnv ? (
        <Callout title="Unavailable" tone="warning">
          <p>{availability?.message}</p>
          <p className="mt-2">
            Missing environment variable: DVC_SERVICE_URL. Set it to the base URL of a DVC service
            that implements POST /submitTask and GET /getResult. No task was submitted and no proof
            was created.
          </p>
        </Callout>
      ) : null}

      {availability?.invalid ? (
        <Callout title="DVC_SERVICE_URL is invalid" tone="danger">
          {availability.message}
        </Callout>
      ) : null}

      <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-2">
          <Label htmlFor="programId">program_id</Label>
          <Input
            id="programId"
            name="programId"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
            disabled={!configured || busy}
            spellCheck={false}
            placeholder="UUID from uploadProgram"
            className="h-10 font-mono"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            The DVC-Demo service returns a UUID from POST /uploadProgram. ProofLab does not upload
            ELF files and does not invent a program id.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="attestationData">attestation_data</Label>
          <Textarea
            id="attestationData"
            name="attestationData"
            value={attestationData}
            onChange={(event) => setAttestationData(event.target.value)}
            disabled={!configured || busy}
            spellCheck={false}
            placeholder='{"public_data":[],"private_data":{},"verification_type":"HASH_COMPARISON"}'
            className="min-h-40 font-mono"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            JSON forwarded as the attestation_data form field. A Network DVC payload uses
            public_data, private_data, and verification_type. An enterprise zkTLS attestation is a
            different object. ProofLab does not rewrite one into the other.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={!configured || busy}>
            {busy ? "Contacting DVC service" : "Submit task"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!configured || busy || !serviceTaskId}
            onClick={() => {
              if (!serviceTaskId) return;
              const controller = new AbortController();
              abortRef.current?.abort();
              abortRef.current = controller;
              setBusy(true);
              void poll(serviceTaskId, programId.trim(), controller.signal).finally(
                () => setBusy(false),
              );
            }}
          >
            Poll getResult
          </Button>
        </div>
      </form>

      {message ? <p className="text-sm leading-6 text-muted-foreground">{message}</p> : null}
      {response !== null ? <JsonBlock value={response} label="DVC service response" /> : null}
    </div>
  );
}
