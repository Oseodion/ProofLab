import { Suspense } from "react";
import { ComputePanel, type Availability } from "@/components/compute-panel";
import { ExternalLink } from "@/components/external-link";
import { PageShell } from "@/components/page-shell";
import { links } from "@/lib/links";
import { dvcAvailability } from "@/lib/server/dvc";
import { bindRequest, readEnv } from "@/lib/server/env";

export const metadata = {
  title: "Compute",
  description: "Submit a DVC task when DVC_SERVICE_URL is configured.",
};

export default function ComputePage() {
  return (
    <Suspense
      fallback={
        <PageShell
          eyebrow="DVC computation"
          title="Computation panel"
          lede="zkVM proving is a second step. This page explains that pipeline and, when DVC_SERVICE_URL is set, forwards program_id and attestation_data to the service and polls getResult."
        >
          <p className="text-sm text-muted-foreground">Reading DVC_SERVICE_URL…</p>
        </PageShell>
      }
    >
      <ComputeContent />
    </Suspense>
  );
}

function availabilitySnapshot(body: Record<string, unknown>): Availability {
  return {
    configured: body.configured === true,
    missing: Array.isArray(body.missing)
      ? body.missing.filter((item): item is string => typeof item === "string")
      : [],
    invalid: body.invalid === true ? true : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    programId: typeof body.programId === "string" ? body.programId : null,
    programIdInvalid: body.programIdInvalid === true,
  };
}

async function ComputeContent() {
  await bindRequest();
  const availability = availabilitySnapshot(
    dvcAvailability(readEnv("DVC_SERVICE_URL"), readEnv("DVC_PROGRAM_ID")).body,
  );
  return (
    <PageShell
      eyebrow="DVC computation"
      title="Computation panel"
      lede="zkVM proving is a second step. This page explains that pipeline and, when DVC_SERVICE_URL is set, forwards program_id and attestation_data to the service and polls getResult."
    >
      <div className="grid gap-8">
        <section className="grid gap-3 text-sm leading-6 text-muted-foreground">
          <h2 className="text-base font-medium text-foreground">What the DVC service does</h2>
          <p>
            In <ExternalLink href={links.dvcDemo}>primus-labs/DVC-Demo</ExternalLink>, the client
            first obtains a zkTLS attestation, recovers plaintext locally, and builds an
            attestation_data JSON document. The network-succinct verifier accepts verification_type
            HASH_COMPARSION, with private_data.plain_json_response, or AES_DECRYPTION, with
            private_data.aes_key. The hash type is spelled HASH_COMPARSION in that crate.
          </p>
          <p>
            POST /submitTask sends program_id and attestation_data as form fields. The service
            writes the payload to disk and queues a worker. The worker runs the Succinct prover
            against the uploaded ELF. GET /getResult?task_id= returns the task record. Status values
            used by that service are queued, running, done, and error.
          </p>
          <p>
            The guest verifies the attestation, then runs its predicate. The Succinct prover in
            DVC-Demo verifies the SNARK before it writes proof_fixture.json. ProofLab marks prover
            verification only when that fixture and the line Successfully verified proof! are both
            in the service payload. It does not run an SP1 verifier of its own. A verified studio
            attestation is submitted from its result page when it is already a Network document or
            an enterprise ciphertext object with aes_key. A reveal such as a plaintext screen_name
            is not rewritten into either shape.
          </p>
        </section>
        <ComputePanel
          initialAvailability={availability}
          initialProgramId={availability.programId ?? ""}
        />
      </div>
    </PageShell>
  );
}
