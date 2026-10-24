const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const SIGN_PARAMS_MAX = 200_000;
export const ADDITION_PARAMS_MAX = 8_192;
export const ATTESTATION_DATA_MAX = 1_500_000;

export type AlgorithmType = "proxytls" | "mpctls";

export type AttestFormInput = {
  templateId: string;
  userAddress: string;
  additionParams: string;
  algorithmType: string;
};

export type AttestFormValue = {
  templateId: string;
  userAddress: string;
  additionParams: string | null;
  algorithmType: AlgorithmType;
};

export type FieldError = { ok: false; message: string };
export type FieldOk<T> = { ok: true; value: T };

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isUserAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value) || SOLANA_ADDRESS_RE.test(value);
}

export function isAlgorithmType(value: string): value is AlgorithmType {
  return value === "proxytls" || value === "mpctls";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAttestForm(input: AttestFormInput): FieldOk<AttestFormValue> | FieldError {
  const templateId = input.templateId.trim();
  if (!isUuid(templateId)) {
    return {
      ok: false,
      message:
        "Template ID must be a UUID from the Primus marketplace or your Dev Hub project.",
    };
  }

  const userAddress = input.userAddress.trim();
  if (!isUserAddress(userAddress)) {
    return {
      ok: false,
      message:
        "User address must be an EVM address (0x and 40 hex characters) or a Solana address.",
    };
  }

  const algorithmType = input.algorithmType.trim();
  if (!isAlgorithmType(algorithmType)) {
    return {
      ok: false,
      message: "TLS mode must be proxytls or mpctls.",
    };
  }

  const additionRaw = input.additionParams.trim();
  let additionParams: string | null = null;
  if (additionRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(additionRaw);
    } catch {
      return { ok: false, message: "Addition params must be a JSON object." };
    }
    if (!isPlainObject(parsed)) {
      return { ok: false, message: "Addition params must be a JSON object." };
    }
    additionParams = JSON.stringify(parsed);
    if (additionParams.length > ADDITION_PARAMS_MAX) {
      return {
        ok: false,
        message: `Addition params must be at most ${ADDITION_PARAMS_MAX} characters.`,
      };
    }
  }

  return {
    ok: true,
    value: { templateId, userAddress, additionParams, algorithmType },
  };
}

export function isAppId(value: string): boolean {
  return value.length >= 1 && value.length <= 128 && !/[\s"'\\<>]/.test(value);
}

export function parseSignBody(
  body: unknown,
  expectedAppId: string,
): FieldOk<string> | FieldError {
  if (!isPlainObject(body) || typeof body.signParams !== "string") {
    return { ok: false, message: "Body must be JSON with a signParams string." };
  }

  const signParams = body.signParams;
  if (signParams.length === 0 || signParams.length > SIGN_PARAMS_MAX) {
    return {
      ok: false,
      message: `signParams must be between 1 and ${SIGN_PARAMS_MAX} characters.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(signParams);
  } catch {
    return { ok: false, message: "signParams must be JSON from AttRequest.toJsonString()." };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, message: "signParams must be a JSON object." };
  }

  if (typeof parsed.appId !== "string" || !isAppId(parsed.appId)) {
    return { ok: false, message: "signParams.appId is missing or invalid." };
  }

  if (parsed.appId !== expectedAppId) {
    return {
      ok: false,
      message:
        "signParams.appId does not match PRIMUS_APP_ID. The browser app id and the server app id must be the same project.",
    };
  }

  if (typeof parsed.attTemplateID !== "string" || !isUuid(parsed.attTemplateID)) {
    return { ok: false, message: "signParams.attTemplateID must be a UUID." };
  }

  if (typeof parsed.userAddress !== "string" || !isUserAddress(parsed.userAddress)) {
    return { ok: false, message: "signParams.userAddress is missing or invalid." };
  }

  if (typeof parsed.timestamp !== "number" || !Number.isFinite(parsed.timestamp)) {
    return { ok: false, message: "signParams.timestamp must be a finite number." };
  }

  if (parsed.timestamp < 1_700_000_000_000 || parsed.timestamp > 4_102_444_800_000) {
    return { ok: false, message: "signParams.timestamp is outside the accepted range." };
  }

  if (typeof parsed.requestid !== "string" || !isUuid(parsed.requestid)) {
    return { ok: false, message: "signParams.requestid must be a UUID." };
  }

  if (parsed.attMode !== undefined) {
    if (!isPlainObject(parsed.attMode) || !isAlgorithmType(String(parsed.attMode.algorithmType))) {
      return {
        ok: false,
        message: "signParams.attMode.algorithmType must be proxytls or mpctls.",
      };
    }
  }

  if (parsed.additionParams !== undefined && typeof parsed.additionParams !== "string") {
    return { ok: false, message: "signParams.additionParams must be a string." };
  }

  if (
    typeof parsed.additionParams === "string" &&
    parsed.additionParams.length > ADDITION_PARAMS_MAX
  ) {
    return { ok: false, message: "signParams.additionParams is too large." };
  }

  if (parsed.computeMode !== undefined) {
    const mode = parsed.computeMode;
    if (mode !== "normal" && mode !== "nonecomplete" && mode !== "nonepartial") {
      return { ok: false, message: "signParams.computeMode is not a known AttRequest mode." };
    }
  }

  return { ok: true, value: signParams };
}

export type DvcSubmitValue = {
  programId: string;
  attestationData: string;
};

export function parseDvcSubmit(body: unknown): FieldOk<DvcSubmitValue> | FieldError {
  if (!isPlainObject(body)) {
    return { ok: false, message: "Body must be a JSON object." };
  }

  const programId = typeof body.program_id === "string" ? body.program_id.trim() : "";
  if (!isUuid(programId)) {
    return {
      ok: false,
      message:
        "program_id must be a UUID returned by the DVC service uploadProgram endpoint.",
    };
  }

  const attestationData =
    typeof body.attestation_data === "string" ? body.attestation_data : "";
  if (!attestationData.trim()) {
    return { ok: false, message: "attestation_data is required." };
  }
  if (attestationData.length > ATTESTATION_DATA_MAX) {
    return {
      ok: false,
      message: `attestation_data must be at most ${ATTESTATION_DATA_MAX} characters.`,
    };
  }

  try {
    const parsed = JSON.parse(attestationData) as unknown;
    if (!isPlainObject(parsed) && !Array.isArray(parsed)) {
      return { ok: false, message: "attestation_data must be a JSON object or array." };
    }
  } catch {
    return { ok: false, message: "attestation_data must be valid JSON." };
  }

  return { ok: true, value: { programId, attestationData } };
}

export type DvcBase =
  | { ok: true; base: string }
  | { ok: false; code: "missing" | "invalid"; message: string };

export function parseDvcBase(raw: string | undefined): DvcBase {
  if (!raw?.trim()) {
    return {
      ok: false,
      code: "missing",
      message:
        "DVC submit is unavailable. Missing environment variable: DVC_SERVICE_URL.",
    };
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, code: "invalid", message: "DVC_SERVICE_URL is not a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      code: "invalid",
      message: "DVC_SERVICE_URL must use http or https.",
    };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      code: "invalid",
      message: "DVC_SERVICE_URL must not include credentials.",
    };
  }

  if (!url.hostname) {
    return { ok: false, code: "invalid", message: "DVC_SERVICE_URL is missing a host." };
  }

  const path = url.pathname.replace(/\/+$/, "");
  return { ok: true, base: `${url.protocol}//${url.host}${path}` };
}
