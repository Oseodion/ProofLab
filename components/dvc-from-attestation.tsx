"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ComputePanel, type Availability } from "@/components/compute-panel";
import { loadDvcMaterial } from "@/lib/client/dvc-material";
import { buildDvcAttestationData } from "@/lib/dvc-document";

export function DvcFromAttestation({
  taskId,
  attestation,
}: {
  taskId: string;
  attestation: unknown;
}) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const material = useMemo(() => loadDvcMaterial(taskId), [taskId]);
  const built = useMemo(
    () => buildDvcAttestationData(attestation, material),
    [attestation, material],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dvc/status");
        const body = (await res.json()) as Availability;
        if (!cancelled) setAvailability(body);
      } catch {
        if (!cancelled) {
          setAvailability({
            configured: false,
            missing: ["DVC_SERVICE_URL"],
            message: "Could not read DVC service status.",
          });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-4 border-t border-border pt-6">
      <div>
        <h2 className="text-base font-medium">Verifiable computation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This step submits the verified attestation to your DVC service. The guest is what proves
          a condition. Private fields stay out of this page and are sent only if the document
          already contains them.
        </p>
      </div>
      {availability ? (
        <ComputePanel
          initialAvailability={availability}
          initialProgramId={availability.programId ?? ""}
          prepared={
            built.ok
              ? {
                  attestationData: built.attestationData,
                  shape: built.shape,
                  privateFieldNames: built.privateFieldNames,
                }
              : null
          }
          prepareMessage={built.ok ? null : built.message}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Reading DVC_SERVICE_URL…</p>
      )}
      <p className="text-sm">
        <Link href="/compute" className="text-primary underline-offset-4 hover:underline">
          Open the computation panel
        </Link>{" "}
        <span className="text-muted-foreground">
          to paste a Network attestation_data document from a Primus Network run.
        </span>
      </p>
    </section>
  );
}
