import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";
import { AttestationResult } from "@/components/attestation-result";
import { runAttestation } from "@/lib/client/run-attestation";
import type { AttestationTask } from "@/lib/types";
import { statusFromVerifyResult } from "@/lib/verify-state";

const TEMPLATE = "2e3160ae-8b1e-45e3-8c59-426366278b9d";
const ADDRESS = "0x7ab44DE0156925fe0c24482a2cDe48C465e47573";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("verifyAttestation false", () => {
  it("maps a false result to the unverified status", () => {
    expect(statusFromVerifyResult(false)).toBe("unverified");
    expect(statusFromVerifyResult(true)).toBe("verified");
    expect(statusFromVerifyResult(undefined)).toBe("unverified");
  });

  it("keeps the attestation unverified in the runner and the result view", async () => {
    const request = {
      requestid: "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f",
      setAdditionParams: vi.fn(),
      setAttMode: vi.fn(),
      setAllJsonResponseFlag: vi.fn(),
      toJsonString: () => "{}",
    };
    const primus = {
      init: vi.fn(async () => true),
      generateRequestParams: vi.fn(() => request),
      startAttestation: vi.fn(async () => ({
        recipient: ADDRESS,
        request: { url: "https://example.com/api", method: "GET", header: "", body: "" },
        reponseResolve: [],
        data: "{}",
        attConditions: "[]",
        timestamp: 1_761_340_000_000,
        additionParams: "",
        attestors: [{ attestorAddr: "0x1111111111111111111111111111111111111111", url: "https://primuslabs.org" }],
        signatures: ["0xsig"],
      })),
      verifyAttestation: vi.fn(() => false),
    };

    const result = await runAttestation(
      {
        templateId: TEMPLATE,
        userAddress: ADDRESS,
        additionParams: "",
        algorithmType: "proxytls",
      },
      {
        appId: "app-1",
        platform: "pc",
        primus: primus as unknown as PrimusZKTLS,
        sign: async () => ({ ok: true, signResult: "{\"signed\":true}" }),
      },
    );

    expect(result.status).toBe("unverified");
    expect(result.verifyResult).toBe(false);
    expect(result.dvcMaterial).toBeNull();
    expect(request.setAllJsonResponseFlag).toHaveBeenCalledWith("true");
    expect(primus.verifyAttestation).toHaveBeenCalledOnce();

    const task: AttestationTask = {
      id: "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f",
      kind: "zktls-attestation",
      createdAt: "2026-10-24T12:00:00.000Z",
      updatedAt: "2026-10-24T12:00:00.000Z",
      templateId: TEMPLATE,
      userAddress: ADDRESS,
      algorithmType: "proxytls",
      additionParams: null,
      status: result.status,
      verifyResult: result.verifyResult,
      error: result.error,
      attestation: result.attestation,
    };

    render(<AttestationResult task={task} />);
    const pill = screen.getByRole("status");
    expect(pill).toHaveAttribute("data-status", "unverified");
    expect(pill).toHaveTextContent("Unverified");
    expect(screen.getByText(/this record is unverified/i)).toBeInTheDocument();
    expect(screen.getByText("zkTLS attestation")).toBeInTheDocument();
    expect(screen.queryByText("Verifiable computation")).not.toBeInTheDocument();
  });

  it("blocks a verified reveal from being submitted as DVC input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            configured: false,
            missing: ["DVC_SERVICE_URL"],
            programId: null,
            message: "DVC submit is unavailable. Missing environment variable: DVC_SERVICE_URL.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const task: AttestationTask = {
      id: "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f",
      kind: "zktls-attestation",
      createdAt: "2026-10-24T12:00:00.000Z",
      updatedAt: "2026-10-24T12:00:00.000Z",
      templateId: TEMPLATE,
      userAddress: ADDRESS,
      algorithmType: "proxytls",
      additionParams: null,
      status: "verified",
      verifyResult: true,
      error: null,
      attestation: {
        recipient: ADDRESS,
        data: JSON.stringify({ screen_name: "web3_tech_" }),
        signatures: ["0xabc"],
        attestors: [],
      },
    };

    render(<AttestationResult task={task} />);
    expect(await screen.findByText(/cannot be submitted as DVC input/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit task" })).toBeDisabled();
    expect(screen.getAllByText(/Missing environment variable: DVC_SERVICE_URL/).length).toBeGreaterThan(0);
  });
});
