import { describe, expect, it, vi } from "vitest";
import { dvcAvailability, submitToDvc } from "@/lib/server/dvc";

const PROGRAM = "2e3160ae-8b1e-45e3-8c59-426366278b9d";

describe("DVC proxy", () => {
  it("reports the missing DVC_SERVICE_URL and does not call the network", async () => {
    const status = dvcAvailability(undefined);
    expect(status.body.missing).toEqual(["DVC_SERVICE_URL"]);
    expect(String(status.body.message)).toContain("Missing environment variable: DVC_SERVICE_URL");

    const fetchImpl = vi.fn();
    const result = await submitToDvc(
      undefined,
      { program_id: PROGRAM, attestation_data: "{}" },
      fetchImpl,
    );
    expect(result.status).toBe(503);
    expect(result.body.missing).toEqual(["DVC_SERVICE_URL"]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an invalid program id before calling the service", async () => {
    const fetchImpl = vi.fn();
    const result = await submitToDvc(
      "https://dvc.example",
      { program_id: "not-a-uuid", attestation_data: "{}" },
      fetchImpl,
    );
    expect(result.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts program_id and attestation_data to /submitTask", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ task_id: PROGRAM, status: "queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const attestation = JSON.stringify({ public_data: [], verification_type: "HASH_COMPARISON" });
    const result = await submitToDvc(
      "https://dvc.example/base/",
      { program_id: PROGRAM, attestation_data: attestation },
      fetchImpl,
    );
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.payload).toEqual({ task_id: PROGRAM, status: "queued" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://dvc.example/base/submitTask");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("program_id")).toBe(PROGRAM);
    expect(form.get("attestation_data")).toBe(attestation);
  });
});
