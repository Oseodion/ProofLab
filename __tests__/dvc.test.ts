import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { interpretDvcResult } from "@/lib/dvc-document";
import {
  CLIENT_BODY_MAX,
  UPSTREAM_BODY_MAX,
  compactDvcPayload,
  dvcAvailability,
  fetchDvcResult,
  submitToDvc,
} from "@/lib/server/dvc";

const PROGRAM = "2e3160ae-8b1e-45e3-8c59-426366278b9d";

describe("DVC proxy", () => {
  it("prefills a UUID program id and ignores a non-UUID", () => {
    const ready = dvcAvailability("https://dvc.example", PROGRAM);
    expect(ready.body.programId).toBe(PROGRAM);
    expect(String(ready.body.message)).toContain("DVC_PROGRAM_ID is prefilled");

    const bad = dvcAvailability("https://dvc.example", "elf");
    expect(bad.body.programId).toBeNull();
    expect(bad.body.programIdInvalid).toBe(true);
  });

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

describe("DVC getResult with a full-size proof", () => {
  const TASK = "21459fc8-0c08-479d-84f6-06a4db780fa9";
  const VK = `0x${"ab".repeat(235)}`;
  const PUBLIC_VALUES = `0x02${"00".repeat(165)}`;

  function upstream(body: Record<string, unknown>) {
    const text = JSON.stringify(body);
    return {
      text,
      fetchImpl: vi.fn(async () =>
        new Response(text, { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    };
  }

  it("keeps status and the verify line for a >2 MB done response and reports it verified", async () => {
    const proof = `0x${"0f".repeat(1_600_000)}`;
    const { text, fetchImpl } = upstream({
      status: "done",
      prover: "succinct",
      result: "Successfully generated proof!\nSuccessfully verified proof!\nSuccessfully saved proof!\n",
      env: { NETWORK_PRIVATE_KEY: "do-not-forward" },
      proof_fixture: JSON.stringify({ vk: VK, proof_id: "", proof, public_values: PUBLIC_VALUES }),
    });
    expect(text.length).toBeGreaterThan(2_000_000);

    const result = await fetchDvcResult("https://dvc.example", TASK, fetchImpl);
    expect(result.status).toBe(200);
    const serialized = JSON.stringify(result.body);
    expect(serialized.length).toBeLessThan(CLIENT_BODY_MAX);
    expect(serialized).not.toContain("do-not-forward");

    const payload = result.body.payload as Record<string, unknown>;
    expect(payload.status).toBe("done");
    expect(payload.truncated).toBeUndefined();
    const fixture = JSON.parse(String(payload.proof_fixture)) as Record<string, unknown>;
    expect(fixture.vk).toBe(VK);
    expect(fixture.public_values).toBe(PUBLIC_VALUES);
    expect(fixture.proof_truncated).toBe(true);
    expect(fixture.proof_hex_chars).toBe(proof.length);
    expect(fixture.proof_sha256).toBe(createHash("sha256").update(proof).digest("hex"));
    expect(String(fixture.proof)).toBe(proof.slice(0, 512));

    const interpreted = interpretDvcResult(result.body);
    expect(interpreted.serviceStatus).toBe("done");
    expect(interpreted.proverVerified).toBe(true);
    expect(interpreted.proofPresent).toBe(true);
    expect(interpreted.publicValues).toBe(PUBLIC_VALUES);
  });

  it("keeps a crashed prover that the service still marks done unverified", async () => {
    const { fetchImpl } = upstream({
      status: "done",
      prover: "succinct",
      result: "thread 'main' panicked at src/main.rs:42:5:\nError: 1 Unsatisfied\n",
      proof_fixture: "{}",
    });
    const result = await fetchDvcResult("https://dvc.example", TASK, fetchImpl);
    const interpreted = interpretDvcResult(result.body);
    expect(interpreted.serviceStatus).toBe("done");
    expect(interpreted.proverVerified).toBe(false);
    expect(interpreted.proofPresent).toBe(false);
  });

  it("keeps a large proof without the verify line unverified", async () => {
    const proof = `0x${"0f".repeat(1_600_000)}`;
    const { fetchImpl } = upstream({
      status: "done",
      result: "Successfully generated proof!\nthread 'main' panicked: verification failed\n",
      proof_fixture: JSON.stringify({ vk: VK, proof, public_values: PUBLIC_VALUES }),
    });
    const result = await fetchDvcResult("https://dvc.example", TASK, fetchImpl);
    expect(JSON.stringify(result.body).length).toBeLessThan(CLIENT_BODY_MAX);
    const interpreted = interpretDvcResult(result.body);
    expect(interpreted.serviceStatus).toBe("done");
    expect(interpreted.proofPresent).toBe(true);
    expect(interpreted.proverVerified).toBe(false);
  });

  it("returns a raw preview, not a verdict, for a body over the read limit", async () => {
    const text = `{"status":"done","result":"${"x".repeat(UPSTREAM_BODY_MAX)}"}`;
    const fetchImpl = vi.fn(async () => new Response(text, { status: 200 }));
    const result = await fetchDvcResult("https://dvc.example", TASK, fetchImpl);
    const payload = result.body.payload as Record<string, unknown>;
    expect(payload.truncated).toBe(true);
    expect(String(payload.raw).length).toBeLessThanOrEqual(4_000);
    const interpreted = interpretDvcResult(result.body);
    expect(interpreted.proverVerified).toBe(false);
    expect(interpreted.detail).toContain("larger than");
  });
});

describe("compactDvcPayload", () => {
  it("leaves a small task untouched apart from env", () => {
    const task = { status: "queued", result: null, env: {}, proof_fixture: "{}" };
    expect(compactDvcPayload(task)).toEqual({ status: "queued", result: null, proof_fixture: "{}" });
  });
});
