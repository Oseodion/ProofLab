import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ResultView } from "@/components/result-view";

export const metadata = {
  title: "Attestation result",
  description: "zkTLS attestation metadata and the verifyAttestation result.",
};

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <PageShell
          eyebrow="zkTLS attestation"
          title="Attestation result"
          lede="Loading the task id."
        >
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageShell>
      }
    >
      <ResultRoute params={params} />
    </Suspense>
  );
}

async function ResultRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultView id={id} />;
}
