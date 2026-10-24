import { isUuid, parseDvcBase, parseDvcSubmit } from "@/lib/validation";

export type DvcHandlerResult = {
  status: number;
  body: Record<string, unknown>;
};

const UPSTREAM_TIMEOUT_MS = 20_000;

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function readUpstream(response: Response): Promise<unknown> {
  const text = await response.text();
  const clipped = text.length > 2_000_000 ? text.slice(0, 4_000) : text;
  try {
    return JSON.parse(clipped) as unknown;
  } catch {
    return {
      raw: clipped,
      truncated: text.length > 2_000_000,
    };
  }
}

export function dvcAvailability(raw: string | undefined): DvcHandlerResult {
  const parsed = parseDvcBase(raw);
  if (parsed.ok) {
    return {
      status: 200,
      body: {
        configured: true,
        missing: [],
        message: "DVC_SERVICE_URL is set. Submit forwards program_id and attestation_data to that service.",
      },
    };
  }

  if (parsed.code === "missing") {
    return {
      status: 200,
      body: {
        configured: false,
        missing: ["DVC_SERVICE_URL"],
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
