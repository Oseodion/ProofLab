import { Suspense } from "react";
import { AttestStudio } from "@/components/attest-studio";
import { PageShell } from "@/components/page-shell";
import { defaultTemplateId } from "@/lib/server/defaults";

export const metadata = {
  title: "Attest",
  description: "Run a Primus zkTLS attestation and verify the attestor signature.",
};

export default function AttestPage() {
  return (
    <Suspense
      fallback={
        <PageShell
          eyebrow="zkTLS attestation"
          title="Attestation studio"
          lede="Loading the template default from the server environment."
        >
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageShell>
      }
    >
      <AttestContent />
    </Suspense>
  );
}

async function AttestContent() {
  const templateId = await defaultTemplateId();
  return (
    <PageShell
      eyebrow="zkTLS attestation"
      title="Attestation studio"
      lede="This runs generateRequestParams, server-side sign, startAttestation, and verifyAttestation. A true result is a verified zkTLS attestation."
    >
      <AttestStudio defaultTemplateId={templateId} />
    </PageShell>
  );
}
