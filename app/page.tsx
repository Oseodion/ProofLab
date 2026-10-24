import Link from "next/link";
import { ExternalLink } from "@/components/external-link";
import { PageShell } from "@/components/page-shell";
import { Readiness } from "@/components/readiness";
import { links } from "@/lib/links";

const ATTEST_STEPS = [
  { name: "init", detail: 'Browser: PrimusZKTLS.init(appId, "", { platform })' },
  { name: "generateRequestParams", detail: "Template ID and user address become an AttRequest." },
  { name: "setAdditionParams / setAttMode", detail: "Optional JSON object and proxytls or mpctls." },
  { name: "sign", detail: "POST the request JSON to /api/primus/sign. The server calls init(appId, appSecret) and sign(signParams)." },
  { name: "startAttestation", detail: "The extension runs the TLS attestation with Primus attestors." },
  { name: "verifyAttestation", detail: "The boolean return is the only path to a Verified state." },
];

const DVC_STEPS = [
  { name: "Attestation data", detail: "After a Network zkTLS run, the client builds public_data, private_data, and verification_type. Plaintext is recovered locally." },
  { name: "Program", detail: "A Rust guest for Succinct is compiled to an ELF and uploaded. uploadProgram returns program_id. The guest verifies the attestation, then runs the predicate." },
  { name: "submitTask", detail: "POST form fields program_id and attestation_data. The service queues the task." },
  { name: "getResult", detail: "Poll with task_id. Status moves queued, running, done, or error. A done payload can include a proof fixture." },
];

export default function HomePage() {
  return (
    <PageShell
      eyebrow="Primus Epoch 2"
      title="From web data attestation to verifiable computation — without confusing the two."
      lede="ProofLab runs the enterprise zkTLS attestation flow from the Primus production example. A second panel can submit that data to a DVC service when you configure one. Each result is labeled with the check that actually ran."
    >
      <div className="grid gap-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-5">
            <p className="font-mono text-xs text-primary">Step 1 · live path</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">zkTLS attestation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A zkTLS attestation is a signed record that an HTTPS transcript matched a template.
              verifyAttestation checks the attestor signature. The studio on this site performs that
              flow in the browser and keeps the App Secret on the server.
            </p>
            <ol className="mt-4 grid gap-3">
              {ATTEST_STEPS.map((step, index) => (
                <li key={step.name} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
                  <span className="font-mono text-muted-foreground">{index + 1}</span>
                  <span>
                    <span className="font-medium">{step.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm">
              <Link href="/attest" className="text-primary underline-offset-4 hover:underline">
                Open the attestation studio
              </Link>
            </p>
          </article>

          <article className="rounded-lg border border-border bg-card p-5">
            <p className="font-mono text-xs text-primary">Step 2 · separate service</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">DVC computation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A DVC computation is a zkVM execution. The guest verifies attestation data, then applies
              a predicate such as a balance threshold, and the prover returns a SNARK. Primus documents
              this as a follow-on step in DVC-Demo. ProofLab can forward a payload to that service. It
              does not treat the attestation signature as that SNARK.
            </p>
            <ol className="mt-4 grid gap-3">
              {DVC_STEPS.map((step, index) => (
                <li key={step.name} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
                  <span className="font-mono text-muted-foreground">{index + 1}</span>
                  <span>
                    <span className="font-medium">{step.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm">
              <Link href="/compute" className="text-primary underline-offset-4 hover:underline">
                Open the computation panel
              </Link>
            </p>
          </article>
        </div>

        <Readiness />

        <section className="grid gap-2 text-sm leading-6 text-muted-foreground">
          <h2 className="text-sm font-medium text-foreground">Where the pieces come from</h2>
          <p>
            Attestation calls follow{" "}
            <ExternalLink href={links.productionExample}>zktls-demo/production-example</ExternalLink>{" "}
            and <ExternalLink href={links.enterpriseSdk}>the enterprise zkTLS SDK docs</ExternalLink>.
            The computation panel follows{" "}
            <ExternalLink href={links.dvcDemo}>DVC-Demo</ExternalLink> submitTask and getResult, described
            in the <ExternalLink href={links.dvcDocs}>DVC docs</ExternalLink>.
          </p>
          <p>
            Trust assumptions, including what verifyAttestation does and what this app leaves to a
            verifier contract, are on the <Link href="/trust" className="text-primary underline-offset-4 hover:underline">trust page</Link>.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
