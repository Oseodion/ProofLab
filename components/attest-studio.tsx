"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Callout } from "@/components/callout";
import { ExternalLink } from "@/components/external-link";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserPrimus, publicPrimusAppId } from "@/lib/client/browser-primus";
import { runAttestation, type AttestationRunResult } from "@/lib/client/run-attestation";
import { postSign } from "@/lib/client/sign-client";
import { saveTask } from "@/lib/history";
import { links } from "@/lib/links";
import { detectPlatform } from "@/lib/platform";
import type { AttestPhase, AttestationTask } from "@/lib/types";
import { parseAttestForm, type AlgorithmType } from "@/lib/validation";

const PHASES: { id: Exclude<AttestPhase, "idle" | "done">; label: string; detail: string }[] = [
  { id: "init", label: "Initialize", detail: 'init(appId, "", { platform })' },
  { id: "request", label: "Request", detail: "generateRequestParams + setAdditionParams + setAttMode" },
  { id: "sign", label: "Sign", detail: "POST /api/primus/sign" },
  { id: "attest", label: "Attest", detail: "startAttestation(signedRequestStr)" },
  { id: "verify", label: "Verify", detail: "verifyAttestation(attestation)" },
];

const ORDER: AttestPhase[] = ["idle", "init", "request", "sign", "attest", "verify", "done"];

function phaseState(
  step: AttestPhase,
  current: AttestPhase,
  failed: boolean,
): "pending" | "done" | "failed" {
  if (current === "idle") return "pending";
  const stepIndex = ORDER.indexOf(step);
  const currentIndex = ORDER.indexOf(current === "done" ? "done" : current);
  if (failed && step === current) return "failed";
  if (current === "done" || stepIndex < currentIndex) return "done";
  return "pending";
}

export function AttestStudio({ defaultTemplateId }: { defaultTemplateId: string }) {
  const router = useRouter();
  const appId = publicPrimusAppId();
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [userAddress, setUserAddress] = useState("");
  const [additionParams, setAdditionParams] = useState("");
  const [algorithmType, setAlgorithmType] = useState<AlgorithmType>("proxytls");
  const [phase, setPhase] = useState<AttestPhase>("idle");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageNote, setStorageNote] = useState<string | null>(null);

  const platform = useMemo(
    () => (typeof navigator === "undefined" ? "pc" : detectPlatform(navigator.userAgent)),
    [],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    setError(null);
    setStorageNote(null);

    const parsed = parseAttestForm({ templateId, userAddress, additionParams, algorithmType });
    if (!parsed.ok) {
      setPhase("idle");
      setError(parsed.message);
      return;
    }

    setRunning(true);
    setPhase("init");
    let result: AttestationRunResult;
    try {
      const primus = await createBrowserPrimus();
      result = await runAttestation(
        { templateId, userAddress, additionParams, algorithmType },
        { appId, platform, primus, sign: postSign },
        setPhase,
      );
    } catch (caught) {
      result = {
        status: "failed",
        verifyResult: null,
        attestation: null,
        error: caught instanceof Error ? caught.message : "Could not load the Primus SDK.",
        phase: "init",
      };
    }

    const now = new Date().toISOString();
    const task: AttestationTask = {
      id: crypto.randomUUID(),
      kind: "zktls-attestation",
      createdAt: now,
      updatedAt: now,
      templateId: parsed.value.templateId,
      userAddress: parsed.value.userAddress,
      algorithmType: parsed.value.algorithmType,
      additionParams: parsed.value.additionParams,
      status: result.status,
      verifyResult: result.verifyResult,
      error: result.error,
      attestation: result.attestation,
    };

    const stored = saveTask(task);
    if (stored === "session") {
      setStorageNote("localStorage rejected the write. This result was kept for the current tab only.");
    } else if (stored === "none") {
      setStorageNote("This browser blocked history storage. The result is shown below and was not saved.");
    }

    setPhase(result.phase);
    setError(result.status === "verified" ? null : result.error);
    setRunning(false);

    if (result.attestation && stored !== "none") {
      router.push(`/results/${task.id}`);
    }
  }

  const failed = Boolean(error) && !running;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
      <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)}>
        {!appId ? (
          <Callout title="Browser App ID is missing" tone="warning">
            Set NEXT_PUBLIC_PRIMUS_APP_ID from{" "}
            <ExternalLink href={links.devHubProjects}>Dev Hub</ExternalLink> and restart the server.
            The form stays usable so you can prepare a template ID and address.
          </Callout>
        ) : null}
        <Callout title="Primus Extension">
          On desktop, init and startAttestation talk to the{" "}
          <ExternalLink href={links.extension}>Primus Extension</ExternalLink>. The App Secret stays
          on the server. iPhone and Android user agents pass platform ios or android, matching the
          production example. Other devices, including iPad, use pc.
        </Callout>

        <div className="grid gap-2">
          <Label htmlFor="templateId">Template ID</Label>
          <Input
            id="templateId"
            name="templateId"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="2e3160ae-8b1e-45e3-8c59-426366278b9d"
            className="h-10 font-mono"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            UUID from the <ExternalLink href={links.marketplace}>marketplace</ExternalLink> or your
            Dev Hub project. Optional default: NEXT_PUBLIC_DEFAULT_TEMPLATE_ID or
            DEFAULT_ATT_TEMPLATE_ID.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="userAddress">Wallet / user address</Label>
          <Input
            id="userAddress"
            name="userAddress"
            value={userAddress}
            onChange={(event) => setUserAddress(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="0x…"
            className="h-10 font-mono"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Recipient written into the attestation. EVM (0x + 40 hex) or Solana address.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="additionParams">Addition params</Label>
          <Textarea
            id="additionParams"
            name="additionParams"
            value={additionParams}
            onChange={(event) => setAdditionParams(event.target.value)}
            spellCheck={false}
            placeholder='{"additionParamsKey1":"value"}'
            className="min-h-28 font-mono"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Optional JSON object. Passed to setAdditionParams as a JSON string. Leave empty to omit
            it.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="algorithmType">TLS mode</Label>
          <select
            id="algorithmType"
            name="algorithmType"
            value={algorithmType}
            onChange={(event) => setAlgorithmType(event.target.value as AlgorithmType)}
            className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground"
          >
            <option value="proxytls">proxytls</option>
            <option value="mpctls">mpctls</option>
          </select>
          <p className="text-sm leading-6 text-muted-foreground">
            Passed to setAttMode. The production example uses proxytls. mpctls selects MPC-TLS.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm leading-6 text-failed">
            {error}
          </p>
        ) : null}
        {storageNote ? <p className="text-sm leading-6 text-muted-foreground">{storageNote}</p> : null}

        <div>
          <Button type="submit" size="lg" disabled={running}>
            {running ? "Attestation in progress" : "Run attestation"}
          </Button>
        </div>
      </form>

      <aside className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Live steps</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Verified is recorded only when verifyAttestation returns true. Platform detected for this
          browser: <span className="font-mono text-foreground">{platform}</span>.
        </p>
        <ol className="mt-4 grid gap-3">
          {PHASES.map((step) => {
            const state = phaseState(step.id, phase, failed && phase === step.id);
            const pill = state === "done" ? "done" : state === "failed" ? "failed" : "pending";
            return (
              <li key={step.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm">{step.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{step.detail}</p>
                </div>
                {running && phase === step.id ? (
                  <span className="font-mono text-xs text-primary">In progress</span>
                ) : (
                  <StatusPill status={pill} />
                )}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
