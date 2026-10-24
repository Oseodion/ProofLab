import type { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";
import { formatUnknownError } from "@/lib/format-error";
import type { AttestPhase } from "@/lib/types";
import { parseAttestForm, type AttestFormInput } from "@/lib/validation";
import { statusFromVerifyResult } from "@/lib/verify-state";
import type { PrimusPlatform } from "@/lib/platform";

export type SignCallResult =
  | { ok: true; signResult: string }
  | { ok: false; message: string };

export type AttestationRunResult = {
  status: "verified" | "unverified" | "failed";
  verifyResult: boolean | null;
  attestation: unknown | null;
  error: string | null;
  phase: AttestPhase;
};

type Deps = {
  appId: string;
  platform: PrimusPlatform;
  primus: PrimusZKTLS;
  sign: (signParams: string) => Promise<SignCallResult>;
};

function failed(phase: AttestPhase, message: string): AttestationRunResult {
  return {
    status: "failed",
    verifyResult: null,
    attestation: null,
    error: message,
    phase,
  };
}

/**
 * Browser half of production-example/client/src/primus.js.
 * The App Secret is not passed here. init receives an empty secret, then the
 * server signs, then startAttestation, then verifyAttestation.
 */
export async function runAttestation(
  input: AttestFormInput,
  deps: Deps,
  onPhase?: (phase: AttestPhase) => void,
): Promise<AttestationRunResult> {
  const form = parseAttestForm(input);
  if (!form.ok) {
    return failed("idle", form.message);
  }

  if (!deps.appId) {
    return failed(
      "idle",
      "Missing environment variable: NEXT_PUBLIC_PRIMUS_APP_ID. Set the public App ID from Dev Hub and restart the dev server.",
    );
  }

  const mark = (phase: AttestPhase) => {
    onPhase?.(phase);
  };

  mark("init");
  try {
    const initResult = await deps.primus.init(deps.appId, "", { platform: deps.platform });
    if (initResult === false) {
      return failed("init", "PrimusZKTLS.init returned false.");
    }
  } catch (error) {
    return failed("init", formatUnknownError(error));
  }

  mark("request");
  let requestStr: string;
  try {
    const request = deps.primus.generateRequestParams(
      form.value.templateId,
      form.value.userAddress,
    );
    if (form.value.additionParams) {
      request.setAdditionParams(form.value.additionParams);
    }
    request.setAttMode({ algorithmType: form.value.algorithmType });
    requestStr = request.toJsonString();
  } catch (error) {
    return failed("request", formatUnknownError(error));
  }

  mark("sign");
  const signed = await deps.sign(requestStr);
  if (!signed.ok) {
    return failed("sign", signed.message);
  }

  mark("attest");
  let attestation: unknown;
  try {
    attestation = await deps.primus.startAttestation(signed.signResult);
  } catch (error) {
    return failed("attest", formatUnknownError(error));
  }

  mark("verify");
  let verifyResult: unknown;
  try {
    verifyResult = await Promise.resolve(
      deps.primus.verifyAttestation(
        attestation as Parameters<PrimusZKTLS["verifyAttestation"]>[0],
      ),
    );
  } catch (error) {
    return {
      status: "failed",
      verifyResult: null,
      attestation,
      error: formatUnknownError(error),
      phase: "verify",
    };
  }

  const status = statusFromVerifyResult(verifyResult);
  mark("done");
  return {
    status,
    verifyResult: verifyResult === true,
    attestation,
    error:
      status === "unverified"
        ? "verifyAttestation returned false. This record is unverified."
        : null,
    phase: "done",
  };
}
