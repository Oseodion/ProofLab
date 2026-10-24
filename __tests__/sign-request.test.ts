import { beforeEach, describe, expect, it, vi } from "vitest";
import { processSignRequest } from "@/lib/server/sign-request";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

const TEMPLATE = "2e3160ae-8b1e-45e3-8c59-426366278b9d";
const ADDRESS = "0x7ab44DE0156925fe0c24482a2cDe48C465e47573";
const REQUEST_ID = "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f";
const SECRET = `0x${"ab".repeat(32)}`;

function bodyFor(appId: string) {
  return {
    signParams: JSON.stringify({
      appId,
      attTemplateID: TEMPLATE,
      userAddress: ADDRESS,
      timestamp: 1_761_340_000_000,
      requestid: REQUEST_ID,
    }),
  };
}

describe("processSignRequest", () => {
  beforeEach(() => {
    delete process.env.PRIMUS_APP_ID;
    delete process.env.PRIMUS_APP_SECRET;
  });

  it("returns 503 and does not call sign when server credentials are missing", async () => {
    const sign = vi.fn();
    const result = await processSignRequest({}, bodyFor("app-1"), sign);
    expect(result.status).toBe(503);
    expect(result.body.missing).toEqual(["PRIMUS_APP_ID", "PRIMUS_APP_SECRET"]);
    expect(JSON.stringify(result.body)).not.toContain(SECRET);
    expect(sign).not.toHaveBeenCalled();
  });

  it("does not sign a mismatched app id", async () => {
    const sign = vi.fn();
    const result = await processSignRequest(
      { appId: "app-1", appSecret: SECRET },
      bodyFor("other-app"),
      sign,
    );
    expect(result.status).toBe(400);
    expect(sign).not.toHaveBeenCalled();
    expect(JSON.stringify(result.body)).not.toContain(SECRET);
  });

  it("returns signResult without echoing the app secret", async () => {
    const sign = vi.fn(async () => "signed-request");
    const result = await processSignRequest(
      { appId: "app-1", appSecret: SECRET },
      bodyFor("app-1"),
      sign,
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ signResult: "signed-request" });
    expect(sign).toHaveBeenCalledWith("app-1", SECRET, bodyFor("app-1").signParams);
    expect(JSON.stringify(result.body)).not.toContain(SECRET);
  });

  it("redacts the secret when sign throws", async () => {
    const result = await processSignRequest(
      { appId: "app-1", appSecret: SECRET },
      bodyFor("app-1"),
      async () => {
        throw new Error(`wallet rejected ${SECRET}`);
      },
    );
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toContain(SECRET);
    expect(String(result.body.message)).toContain("[redacted]");
  });
});

describe("POST /api/primus/sign", () => {
  beforeEach(() => {
    delete process.env.PRIMUS_APP_ID;
    delete process.env.PRIMUS_APP_SECRET;
  });

  it("responds 503 when credentials are absent", async () => {
    const { POST } = await import("@/app/api/primus/sign/route");
    const response = await POST(
      new Request("http://127.0.0.1/api/primus/sign", {
        method: "POST",
        body: JSON.stringify(bodyFor("app-1")),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const payload = (await response.json()) as { missing?: string[]; message?: string };
    expect(response.status).toBe(503);
    expect(payload.missing).toEqual(["PRIMUS_APP_ID", "PRIMUS_APP_SECRET"]);
    expect(JSON.stringify(payload)).not.toContain(SECRET);
  });

  it("rejects a body that is not JSON", async () => {
    const { POST } = await import("@/app/api/primus/sign/route");
    const response = await POST(
      new Request("http://127.0.0.1/api/primus/sign", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(response.status).toBe(400);
  });
});
