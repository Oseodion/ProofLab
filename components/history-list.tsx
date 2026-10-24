"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { getServerTasksSnapshot, getTasksSnapshot, removeTask, subscribeTasks } from "@/lib/history";
import type { TaskRecord } from "@/lib/types";

function stamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function HistoryList() {
  const tasks = useSyncExternalStore<TaskRecord[] | null>(
    subscribeTasks,
    getTasksSnapshot,
    getServerTasksSnapshot,
  );

  if (tasks === null) {
    return <p className="text-sm text-muted-foreground">Loading history from this browser…</p>;
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-6">
        <p className="text-sm leading-6 text-muted-foreground">
          No tasks in this browser yet. Attestations you run are stored in localStorage on this device.
          They are not uploaded with the page view.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/attest" className="text-primary underline-offset-4 hover:underline">
            Run an attestation
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {tasks.map((task) => (
        <li key={task.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={task.status} />
              <span className="font-mono text-xs text-muted-foreground">
                {task.kind === "zktls-attestation" ? "zkTLS attestation" : "DVC computation"}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-sm">
              {task.kind === "zktls-attestation" ? task.templateId : task.programId}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stamp(task.updatedAt)}</p>
            {task.kind === "zktls-attestation" ? (
              <p className="mt-2 text-sm">
                <Link
                  href={`/results/${task.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open attestation
                </Link>
              </p>
            ) : (
              <p className="mt-2 break-all text-sm text-muted-foreground">
                Service task {task.serviceTaskId ?? "not assigned"}
                {task.serviceStatus ? ` · status ${task.serviceStatus}` : ""}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              removeTask(task.id);
            }}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
