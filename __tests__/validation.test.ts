import { describe, expect, it } from "vitest";
import {
  parseAttestForm,
  parseDvcBase,
  parseDvcSubmit,
  parseSignBody,
} from "@/lib/validation";

const TEMPLATE = "2e3160ae-8b1e-45e3-8c59-426366278b9d";
const ADDRESS = "0x7ab44DE0156925fe0c24482a2cDe48C465e47573";
const REQUEST_ID = "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f";

function signParams(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    appId: "app-1",
    attTemplateID: TEMPLATE,
    userAddress: ADDRESS,
    timestamp: 1_761_340_000_000,
    requestid: REQUEST_ID,
    attMode: { algorithmType: "proxytls" },
    ...overrides,
  });
}

describe("parseAttestForm", () => {
  it("accepts a template, address, and optional JSON object", () => {
    const parsed = parseAttestForm({
      templateId: TEMPLATE,
      userAddress: ADDRESS,
      additionParams: ' { "page": 1 } ',
      algorithmType: "mpctls",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.additionParams).toBe('{"page":1}');
      expect(parsed.value.algorithmType).toBe("mpctls");
    }
  });

  it("rejects a non-uuid template and a non-object addition payload", () => {
    expect(
      parseAttestForm({
        templateId: "not-a-template",
        userAddress: ADDRESS,
        additionParams: "",
        algorithmType: "proxytls",
      }).ok,
    ).toBe(false);

    const addition = parseAttestForm({
      templateId: TEMPLATE,
      userAddress: ADDRESS,
      additionParams: "[]",
      algorithmType: "proxytls",
    });
    expect(addition.ok).toBe(false);
    if (!addition.ok) expect(addition.message).toMatch(/JSON object/);
  });
});

describe("parseSignBody", () => {
  it("returns the original string when the request matches the server app id", () => {
    const raw = signParams();
    const parsed = parseSignBody({ signParams: raw }, "app-1");
    expect(parsed).toEqual({ ok: true, value: raw });
  });

  it("rejects an app id that does not match PRIMUS_APP_ID", () => {
    const parsed = parseSignBody({ signParams: signParams({ appId: "other" }) }, "app-1");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(/PRIMUS_APP_ID/);
  });
});

describe("DVC input", () => {
  it("names DVC_SERVICE_URL when the base URL is missing", () => {
    const parsed = parseDvcBase("  ");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.code).toBe("missing");
      expect(parsed.message).toContain("DVC_SERVICE_URL");
    }
  });

  it("rejects credentialed and non-http URLs", () => {
    expect(parseDvcBase("http://user:pass@example.com").ok).toBe(false);
    expect(parseDvcBase("file:///tmp/proof.json").ok).toBe(false);
  });

  it("requires a UUID program id and JSON attestation data", () => {
    const bad = parseDvcSubmit({ program_id: "elf", attestation_data: "{}" });
    expect(bad.ok).toBe(false);
    const good = parseDvcSubmit({
      program_id: TEMPLATE,
      attestation_data: '{"public_data":[]}',
    });
    expect(good.ok).toBe(true);
  });
});
