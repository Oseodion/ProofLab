import { createHash } from "node:crypto";
import { isUuid, parseDvcBase, parseDvcSubmit } from "@/lib/validation";

export type DvcHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

const UPSTREAM_TIMEOUT_MS = 20_000;

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Largest upstream body ProofLab will read. A finished SP1 core proof is ~18.5 MB of JSON. */
export const UPSTREAM_BODY_MAX = 64_000_000;
/** Largest payload ProofLab returns to the browser (and stores in task history). */
export const CLIENT_BODY_MAX = 2_000_000;
const PROOF_PREVIEW_CHARS = 512;
const RAW_PREVIEW_CHARS = 4_000;
const STDOUT_MAX_CHARS = 64_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the upstream body as text, stopping once it passes maxChars.
 * The flag says whether the body was cut, so a cut body is never parsed as if whole.
 */
async function readCappedText(
  response: Response,
  maxChars: number,
): Promise<{ text: string; overLimit: boolean }> {
  if (!response.body) {
    const text = await response.text();
    return text.length > maxChars
      ? { text: text.slice(0, maxChars), overLimit: true }
      : { text, overLimit: false };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    parts.push(chunk);
    length += chunk.length;
    if (length > maxChars) {
      await reader.cancel().catch(() => undefined);
      return { text: parts.join("").slice(0, maxChars), overLimit: true };
    }
  }
  parts.push(decoder.decode());
  return { text: parts.join(""), overLimit: false };
}

/**
 * The SNARK hex is replaced by a short prefix, its length, and its sha256.
 * vk, public_values, and every other fixture field are kept as they are.
 */
function compactProofFixture(raw: unknown): unknown {
  const asString = typeof raw === "string";
  let fixture: unknown = raw;
  if (asString) {
    try {
      fixture = JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  if (!isObject(fixture) || typeof fixture.proof !== "string") return raw;
  const proof = fixture.proof;
  if (proof.length <= PROOF_PREVIEW_CHARS) return raw;
  const compacted = {
    ...fixture,
    proof: proof.slice(0, PROOF_PREVIEW_CHARS),
    proof_truncated: true,
    proof_hex_chars: proof.length,
    proof_sha256: createHash("sha256").update(proof).digest("hex"),
  };
  return asString ? JSON.stringify(compacted) : compacted;
}

function clipString(value: unknown, max: number): unknown {
  return typeof value === "string" && value.length > max ? value.slice(0, max) : value;
}

/**
 * Shapes a parsed DVC task for the browser. The service-side env map is
 * dropped because it can carry prover credentials; status, stdout, vk,
 * public values, and the proof's length and sha256 always survive.
 */
export function compactDvcPayload(value: unknown): unknown {
  if (!isObject(value)) return value;
  const next: Record<string, unknown> = { ...value };
  delete next.env;
  if ("proof_fixture" in next) next.proof_fixture = compactProofFixture(next.proof_fixture);
  if (JSON.stringify(next).length <= CLIENT_BODY_MAX) return next;
  // Still too large: keep the fields the verdict needs and clip free text.
  const essential: Record<string, unknown> = { truncated: true };
  for (const key of ["task_id", "status", "prover", "elapsed", "submitted_at", "error"]) {
    if (key in next) essential[key] = clipString(next[key], RAW_PREVIEW_CHARS);
  }
  essential.result = clipString(next.result, STDOUT_MAX_CHARS);
  const fixture = next.proof_fixture;
  if (typeof fixture === "string" && fixture.length <= CLIENT_BODY_MAX / 2) {
    essential.proof_fixture = fixture;
  } else if (isObject(fixture) && JSON.stringify(fixture).length <= CLIENT_BODY_MAX / 2) {
    essential.proof_fixture = fixture;
  }
  return essential;
}

async function readUpstream(response: Response): Promise<unknown> {
  const { text, overLimit } = await readCappedText(response, UPSTREAM_BODY_MAX);
  if (!overLimit) {
    try {
      return compactDvcPayload(JSON.parse(text) as unknown);
    } catch {
      // Not JSON. Fall through to a raw preview.
    }
  }
  return {
    raw: text.slice(0, RAW_PREVIEW_CHARS),
    truncated: overLimit || text.length > RAW_PREVIEW_CHARS,
    ...(overLimit ? { message: `The DVC response is larger than ${UPSTREAM_BODY_MAX} characters.` } : {}),
  };
}

function programIdField(raw: string | undefined): { programId: string | null; programIdInvalid: boolean } {
  if (!raw?.trim()) return { programId: null, programIdInvalid: false };
  const trimmed = raw.trim();
  if (!isUuid(trimmed)) return { programId: null, programIdInvalid: true };
  return { programId: trimmed, programIdInvalid: false };
}

export function dvcAvailability(raw: string | undefined, programIdRaw?: string): DvcHandlerResult {
  const program = programIdField(programIdRaw);
  const parsed = parseDvcBase(raw);
  if (parsed.ok) {
    const programNote = program.programId
      ? " DVC_PROGRAM_ID is prefilled."
      : program.programIdInvalid
        ? " DVC_PROGRAM_ID is set but is not a UUID, so the form will not use it."
        : "";
    return {
      status: 200,
      body: {
        configured: true,
        missing: [],
        programId: program.programId,
        programIdInvalid: program.programIdInvalid,
        message: `DVC_SERVICE_URL is set. Submit forwards program_id and attestation_data to that service.${programNote}`,
      },
    };
  }

  if (parsed.code === "missing") {
    return {
      status: 200,
      body: {
        configured: false,
        missing: ["DVC_SERVICE_URL"],
        programId: program.programId,
        programIdInvalid: program.programIdInvalid,
        message: parsed.message,
      },
    };
  }

  return {
    status: 200,
    body: {
      configured: false,
      missing: [],
      invalid: true,
      programId: program.programId,
      programIdInvalid: program.programIdInvalid,
      message: parsed.message,
    },
  };
}

export async function submitToDvc(
  rawBase: string | undefined,
  body: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<DvcHandlerResult> {
  const base = parseDvcBase(rawBase);
  if (!base.ok) {
    return {
      status: base.code === "missing" ? 503 : 500,
      body: {
        error: base.code === "missing" ? "unavailable" : "invalid_dvc_service_url",
        missing: base.code === "missing" ? ["DVC_SERVICE_URL"] : [],
        message: base.message,
      },
    };
  }

  const parsed = parseDvcSubmit(body);
  if (!parsed.ok) {
    return { status: 400, body: { error: "invalid_request", message: parsed.message } };
  }

  const form = new FormData();
  form.append("program_id", parsed.value.programId);
  form.append("attestation_data", parsed.value.attestationData);

  let response: Response;
  try {
    response = await fetchImpl(joinUrl(base.base, "/submitTask"), {
      method: "POST",
      body: form,
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return {
      status: 502,
      body: {
        error: "dvc_unreachable",
        message: `Could not reach DVC_SERVICE_URL /submitTask. ${message}`,
      },
    };
  }

  const payload = await readUpstream(response);
  return {
    status: response.ok ? 200 : response.status,
    body: {
      ok: response.ok,
      upstreamStatus: response.status,
      payload,
    },
  };
}

export async function fetchDvcResult(
  rawBase: string | undefined,
  taskId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DvcHandlerResult> {
  const base = parseDvcBase(rawBase);
  if (!base.ok) {
    return {
      status: base.code === "missing" ? 503 : 500,
      body: {
        error: base.code === "missing" ? "unavailable" : "invalid_dvc_service_url",
        missing: base.code === "missing" ? ["DVC_SERVICE_URL"] : [],
        message: base.message,
      },
    };
  }

  if (!isUuid(taskId)) {
    return {
      status: 400,
      body: { error: "invalid_request", message: "task_id must be a UUID." },
    };
  }

  const url = new URL(joinUrl(base.base, "/getResult"));
  url.searchParams.set("task_id", taskId);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return {
      status: 502,
      body: {
        error: "dvc_unreachable",
        message: `Could not reach DVC_SERVICE_URL /getResult. ${message}`,
      },
    };
  }

  const payload = await readUpstream(response);
  return {
    status: response.ok ? 200 : response.status,
    body: {
      ok: response.ok,
      upstreamStatus: response.status,
      payload,
    },
  };
}
