/**
 * Packs a verified attestation into the JSON string DVC-Demo posts as
 * attestation_data. Shapes come from primus-labs/zktls-att-verification:
 *
 * - network-succinct: verification_type HASH_COMPARSION or AES_DECRYPTION,
 *   public_data as an array, private_data.plain_json_response or aes_key.
 *   The spelling HASH_COMPARSION is the string that verifier accepts.
 * - main (enterprise AES): public_data is the enterprise attestation object
 *   and private_data is { aes_key }.
 *
 * A marketplace reveal, such as data: {"screen_name":"..."}, is not either
 * shape. This module does not invent a key, a hash, or a re-encoded signature.
 */

export type DvcShape = "network-dvc" | "enterprise-aes";

export type DvcMaterial = {
  requestId: string;
  allJsonResponse: unknown;
  privateData: unknown;
};

export type DvcBuild =
  | {
      ok: true;
      shape: DvcShape;
      attestationData: string;
      privateFieldNames: string[];
    }
  | { ok: false; code: "reveal" | "missing-private" | "unrecognized"; message: string };

export type DvcInterpretation = {
  serviceStatus: string | null;
  proverVerified: boolean;
  proofPresent: boolean;
  publicValues: string | null;
  detail: string;
};

const AES_128_HEX = /^[0-9a-fA-F]{32}$/;
const NETWORK_TYPES = new Set(["HASH_COMPARSION", "AES_DECRYPTION"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function aesKey(value: unknown): string | null {
  if (!isRecord(value) || typeof value.aes_key !== "string") return null;
  const key = value.aes_key.trim();
  return AES_128_HEX.test(key) ? key : null;
}

function looksLikeReveal(data: string): boolean {
  if (
    data.includes("CompleteHttpResponseCiphertext") ||
    data.includes("PartialHttpResponseCiphertext")
  ) {
    return false;
  }
  try {
    const parsed = JSON.parse(data) as unknown;
    return isRecord(parsed) || Array.isArray(parsed);
  } catch {
    return false;
  }
}

function looksLikeCiphertext(data: string): boolean {
  return (
    data.includes("CompleteHttpResponseCiphertext") ||
    data.includes("PartialHttpResponseCiphertext")
  );
}

function isEnterprisePublic(value: Record<string, unknown>): boolean {
  return (
    typeof value.recipient === "string" &&
    (Array.isArray(value.signatures) || Array.isArray(value.attestors))
  );
}

function networkDocument(value: Record<string, unknown>): DvcBuild | null {
  if (typeof value.verification_type !== "string") return null;
  const verificationType = value.verification_type.trim();
  if (!verificationType) return null;
  if (!isRecord(value.public_data) && !Array.isArray(value.public_data)) return null;

  if (!NETWORK_TYPES.has(verificationType)) {
    const spelling =
      verificationType === "HASH_COMPARISON"
        ? " The network-succinct verifier checks the string HASH_COMPARSION."
        : "";
    return {
      ok: false,
      code: "unrecognized",
      message: `verification_type ${verificationType} is not accepted by zktls-att-verification (network-succinct). Accepted values are HASH_COMPARSION and AES_DECRYPTION.${spelling}`,
    };
  }

  if (!isRecord(value.private_data)) {
    return {
      ok: false,
      code: "missing-private",
      message:
        "This document has verification_type but no private_data object. HASH_COMPARSION needs private_data.plain_json_response. AES_DECRYPTION needs private_data.aes_key. ProofLab will not invent either one.",
    };
  }

  if (verificationType === "HASH_COMPARSION" && !Array.isArray(value.private_data.plain_json_response)) {
    return {
      ok: false,
      code: "missing-private",
      message:
        "HASH_COMPARSION requires private_data.plain_json_response, the array returned by getAllJsonResponse. ProofLab will not invent plaintext.",
    };
  }

  if (verificationType === "AES_DECRYPTION" && !aesKey(value.private_data)) {
    return {
      ok: false,
      code: "missing-private",
      message:
        "AES_DECRYPTION requires private_data.aes_key as 32 hex characters (AES-128). ProofLab will not invent a key.",
    };
  }

  return {
    ok: true,
    shape: "network-dvc",
    attestationData: JSON.stringify(value),
    privateFieldNames: Object.keys(value.private_data),
  };
}

function enterpriseDocument(publicData: Record<string, unknown>, key: string): DvcBuild {
  return {
    ok: true,
    shape: "enterprise-aes",
    attestationData: JSON.stringify({
      public_data: publicData,
      private_data: { aes_key: key },
    }),
    privateFieldNames: ["aes_key"],
  };
}

function enterpriseFailure(publicData: Record<string, unknown>, material: DvcMaterial | null): DvcBuild {
  const data = typeof publicData.data === "string" ? publicData.data : "";
  const keyPresent = Boolean(aesKey(material?.privateData) ?? aesKey(publicData));
  const retained = keyPresent
    ? " An aes_key was present, but the attestation data is not TLS ciphertext, so it was not packed into an enterprise AES document."
    : material && (material.allJsonResponse != null || material.privateData != null)
      ? " The SDK retained private material for this tab, and it did not contain a 32-hex aes_key."
      : "";

  if (looksLikeCiphertext(data)) {
    return {
      ok: false,
      code: "missing-private",
      message: `The attestation data is TLS ciphertext. The enterprise verifier also needs private_data.aes_key, and this run did not include one. ProofLab will not invent a key.${retained}`,
    };
  }

  if (looksLikeReveal(data)) {
    return {
      ok: false,
      code: "reveal",
      message: `verifyAttestation succeeded, and the attestation data field is revealed JSON. That is a zkTLS reveal. A DVC guest that proves a condition without revealing the response needs HASH_COMPARSION (a Network public_data attestation whose data field is a hash, plus local plain_json_response) or enterprise AES ciphertext plus aes_key. ProofLab will not wrap the revealed fields as private_data, and it will not re-encode this signature into the Network shape.${retained}`,
    };
  }

  return {
    ok: false,
    code: "unrecognized",
    message:
      "This attestation is an enterprise object, but its data field is neither revealed JSON nor TLS ciphertext, and no aes_key was returned. ProofLab will not guess a DVC document.",
  };
}

export function buildDvcAttestationData(
  attestation: unknown,
  material: DvcMaterial | null = null,
): DvcBuild {
  if (!isRecord(attestation)) {
    return {
      ok: false,
      code: "unrecognized",
      message: "The stored attestation is not a JSON object, so there is nothing to submit.",
    };
  }

  const network = networkDocument(attestation);
  if (network) return network;

  if (isRecord(attestation.public_data) && typeof attestation.public_data.recipient === "string") {
    const key = aesKey(attestation.private_data);
    const data = typeof attestation.public_data.data === "string" ? attestation.public_data.data : "";
    if (key && looksLikeCiphertext(data)) return enterpriseDocument(attestation.public_data, key);
    if (isEnterprisePublic(attestation.public_data)) {
      return enterpriseFailure(attestation.public_data, material);
    }
  }

  if (isEnterprisePublic(attestation)) {
    const key = aesKey(material?.privateData) ?? aesKey(attestation);
    const data = typeof attestation.data === "string" ? attestation.data : "";
    if (key && looksLikeCiphertext(data)) {
      const publicData = { ...attestation };
      delete publicData.private_data;
      delete publicData.aes_key;
      return enterpriseDocument(publicData, key);
    }
    return enterpriseFailure(attestation, material);
  }

  return {
    ok: false,
    code: "unrecognized",
    message:
      "This value is neither a Network DVC document (verification_type, public_data, private_data) nor an enterprise attestation (recipient, signatures or attestors). ProofLab will not reshape it.",
  };
}

function readProofFixture(value: unknown): Record<string, unknown> | null {
  let parsed = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}") return null;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed)) return null;
  if (Object.keys(parsed).length === 0) return null;
  return parsed;
}

/**
 * The DVC-Demo Succinct prover verifies the SNARK before it writes
 * proof_fixture.json and prints "Successfully verified proof!".
 * ProofLab reports that evidence. It does not run an SP1 verifier itself.
 */
export function interpretDvcResult(body: unknown): DvcInterpretation {
  const payload = isRecord(body) && "payload" in body ? body.payload : body;
  if (!isRecord(payload)) {
    return {
      serviceStatus: null,
      proverVerified: false,
      proofPresent: false,
      publicValues: null,
      detail: "The DVC response did not include a task object.",
    };
  }

  const serviceStatus = typeof payload.status === "string" ? payload.status : null;
  const stdout = typeof payload.result === "string" ? payload.result : "";
  const fixture = readProofFixture(payload.proof_fixture);
  const proof = fixture && typeof fixture.proof === "string" ? fixture.proof : "";
  const vk = fixture && typeof fixture.vk === "string" ? fixture.vk : "";
  const proofPresent = proof.length > 2 && vk.length > 2;
  const proverLine = stdout.includes("Successfully verified proof!");
  const proverVerified = serviceStatus === "done" && proofPresent && proverLine;
  const publicValues =
    fixture && typeof fixture.public_values === "string" && fixture.public_values.length > 0
      ? fixture.public_values
      : null;

  if (proverVerified) {
    return {
      serviceStatus,
      proverVerified: true,
      proofPresent: true,
      publicValues,
      detail:
        "The DVC service returned status done, a proof fixture with proof and vk, and the prover line Successfully verified proof!. That line is the Succinct prover’s own verify step. ProofLab did not re-run an SP1 verifier.",
    };
  }

  if (serviceStatus === "done") {
    return {
      serviceStatus,
      proverVerified: false,
      proofPresent,
      publicValues,
      detail:
        "The DVC service reported status done, and the payload does not contain both a proof fixture and the prover line Successfully verified proof!. ProofLab is not treating this as a verified computation.",
    };
  }

  if (serviceStatus === "error") {
    const errorText = typeof payload.result === "string" ? payload.result : "The service reported status error.";
    return {
      serviceStatus,
      proverVerified: false,
      proofPresent,
      publicValues,
      detail: errorText,
    };
  }

  if (!serviceStatus && payload.truncated === true && typeof payload.raw === "string") {
    return {
      serviceStatus,
      proverVerified: false,
      proofPresent: false,
      publicValues: null,
      detail:
        typeof payload.message === "string"
          ? payload.message
          : "The DVC response was not JSON ProofLab could read. Only a preview is shown.",
    };
  }

  if (typeof payload.error === "string" && !serviceStatus) {
    return {
      serviceStatus,
      proverVerified: false,
      proofPresent: false,
      publicValues: null,
      detail: payload.error,
    };
  }

  return {
    serviceStatus,
    proverVerified: false,
    proofPresent,
    publicValues,
    detail: serviceStatus
      ? `DVC service status: ${serviceStatus}.`
      : "The DVC response did not include a status.",
  };
}
