import { ExternalLink } from "@/components/external-link";
import { PageShell } from "@/components/page-shell";
import { links } from "@/lib/links";

const ASSUMPTIONS = [
  {
    title: "App Secret stays on the server",
    body: "The browser bundle may contain NEXT_PUBLIC_PRIMUS_APP_ID. PRIMUS_APP_SECRET is read only in Route Handlers. The JS SDK signs with that value through ethers.Wallet, so treat the Dev Hub App Secret as a private key.",
  },
  {
    title: "Desktop attestation uses the Primus Extension",
    body: "On the pc platform, init checks window.primus and startAttestation messages the extension. The extension and Primus attestors are part of the trust path for the transcript. ProofLab does not reimplement proxytls or mpctls.",
  },
  {
    title: "verifyAttestation checks a signature",
    body: "The SDK recovers an address from the attestation encoding and compares it with the attestor address compiled into @primuslabs/zktls-js-sdk. ProofLab marks Verified only when that call returns true. A false result stays Unverified. A throw stays Failed.",
  },
  {
    title: "Business checks are still yours",
    body: "After a true signature check, the production example leaves template, URL, and timestamp checks to the application. ProofLab shows the fields that are present. It does not decide that a balance, score, or account is eligible.",
  },
  {
    title: "DVC is a different proof",
    body: "A computation proof is the SNARK from the zkVM guest. The guest verifies attestation data and then runs a predicate. ProofLab will submit to POST /submitTask and poll GET /getResult only when DVC_SERVICE_URL is set. Service status done means the service said done. This app does not verify the SNARK, and it does not ship a verifier contract address.",
  },
  {
    title: "Hosted proving is separate infrastructure",
    body: "SP1 proving and the DVC service are heavy processes. They are a poor fit for a Vercel function. Run them on a VM or use an endpoint you are allowed to call. Access to the sample host in DVC-Demo is not assumed to be open.",
  },
];

const LIMITS = [
  "No mock prover output is shown as a real SNARK. SP1_PROVER=mock is not wired up.",
  "Sample files such as DVC-Demo testdata are not loaded or presented as a fresh attestation.",
  "The attest form leaves computeMode at the SDK default, normal. It does not switch the request into a zkVM ciphertext mode.",
  "Enterprise attestation objects and Network DVC attestation_data objects are not converted into each other.",
  "History is localStorage in this browser. Revealed attestation fields stay on the device unless you paste them into the computation form.",
  "Production Primus projects can require a domain whitelist. A local or preview origin may be rejected by the extension or attestors until it is listed.",
  "Primus enterprise docs describe a free tier of 100 proofs per app id. This app does not display a remaining quota it cannot read.",
  "iPad uses the pc platform value, matching the production example, which only special-cases android and iphone user agents.",
  "ProofLab is an independent demo. It is not published by Primus Labs and does not imply an endorsement.",
];

export const metadata = {
  title: "Trust",
  description: "Trust assumptions and limitations for the ProofLab zkTLS and DVC demo.",
};

export default function TrustPage() {
  return (
    <PageShell
      eyebrow="Assumptions"
      title="What this demo relies on"
      lede="The attestation path is real SDK code. The computation path is a client of a DVC service you configure. Both stop at the evidence they actually have."
    >
      <div className="grid gap-8">
        <section className="grid gap-4">
          {ASSUMPTIONS.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-card px-4 py-4">
              <h2 className="text-base font-medium">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
        <section>
          <h2 className="text-base font-medium">Limitations</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
            {LIMITS.map((item) => (
              <li key={item} className="border-l border-border pl-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="text-sm leading-6 text-muted-foreground">
          <h2 className="text-base font-medium text-foreground">Primary references</h2>
          <ul className="mt-3 grid gap-1">
            <li>
              <ExternalLink href={links.productionExample}>production-example</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.enterpriseSdk}>Enterprise zkTLS SDK</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.enterpriseAttestation}>Enterprise attestation structure</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.dvcDocs}>DVC documentation</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.dvcDemo}>DVC-Demo</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.devHubProjects}>Dev Hub projects</ExternalLink>
            </li>
            <li>
              <ExternalLink href={links.marketplace}>Template marketplace</ExternalLink>
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
