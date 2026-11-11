import { describe, expect, it } from "vitest";
import { buildDvcAttestationData, interpretDvcResult } from "@/lib/dvc-document";

const AES_KEY = "d2762565fcfe2747f4b5908cbb0ff88a";

const enterpriseReveal = {
  recipient: "0x7ab44DE0156925fe0c24482a2cDe48C465e47573",
  request: { url: "https://x.com/i/api/graphql/UserByScreenName", header: "", method: "GET", body: "" },
  reponseResolve: [{ keyName: "screen_name", parseType: "json", parsePath: "$.screen_name" }],
  data: JSON.stringify({ screen_name: "web3_tech_" }),
  attConditions: "[]",
  timestamp: 1_761_340_000_000,
  additionParams: "",
  attestors: [{ attestorAddr: "0x1111111111111111111111111111111111111111", url: "https://primuslabs.xyz" }],
  signatures: ["0xabc"],
};

describe("buildDvcAttestationData", () => {
  it("refuses to wrap a reveal attestation, including one that retained a full response", () => {
    const built = buildDvcAttestationData(enterpriseReveal, {
      requestId: "6f1d7c2e-1b4a-4e5f-9c8d-0a1b2c3d4e5f",
      allJsonResponse: [{ id: "screen_name", content: "{\"screen_name\":\"web3_tech_\"}" }],
      privateData: { screen_name: "commitment", screen_name_plain: "web3_tech_" },
    });
    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.code).toBe("reveal");
      expect(built.message).toContain("revealed JSON");
    }
  });

  it("does not treat a reveal plus an unrelated aes_key as ciphertext", () => {
    const built = buildDvcAttestationData(enterpriseReveal, {
      requestId: "req",
      allJsonResponse: null,
      privateData: { aes_key: AES_KEY },
    });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("reveal");
  });

  it("packs an enterprise ciphertext attestation when privateData contains aes_key", () => {
    const ciphertext = {
      ...enterpriseReveal,
      data: JSON.stringify({ CompleteHttpResponseCiphertext: "{\"packets\":[]}" }),
    };
    const built = buildDvcAttestationData(ciphertext, {
      requestId: "req",
      allJsonResponse: null,
      privateData: { aes_key: AES_KEY },
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.shape).toBe("enterprise-aes");
      expect(built.privateFieldNames).toEqual(["aes_key"]);
      const parsed = JSON.parse(built.attestationData) as {
        public_data: { data: string; aes_key?: string };
        private_data: { aes_key: string };
      };
      expect(parsed.private_data.aes_key).toBe(AES_KEY);
      expect(parsed.public_data.aes_key).toBeUndefined();
      expect(parsed.public_data.data).toContain("CompleteHttpResponseCiphertext");
    }
  });

  it("passes through a Network HASH_COMPARSION document unchanged in meaning", () => {
    const document = {
      verification_type: "HASH_COMPARSION",
      public_data: [{ attestor: "0xabc" }],
      private_data: { plain_json_response: [{ id: "hash-of-response", content: "{\"balances\":[]}" }] },
    };
    const built = buildDvcAttestationData(document);
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.shape).toBe("network-dvc");
      expect(JSON.parse(built.attestationData)).toEqual(document);
    }
  });

  it("names the verifier spelling when the hash type is written HASH_COMPARISON", () => {
    const built = buildDvcAttestationData({
      verification_type: "HASH_COMPARISON",
      public_data: [],
      private_data: { plain_json_response: [] },
    });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.message).toContain("HASH_COMPARSION");
  });
});

describe("interpretDvcResult", () => {
  it("treats a synthetic payload without a proof fixture as not verified", () => {
    const interpreted = interpretDvcResult({
      ok: true,
      payload: { status: "done", result: "Error: 1 Unsatisfied", proof_fixture: "{}" },
    });
    expect(interpreted.serviceStatus).toBe("done");
    expect(interpreted.proverVerified).toBe(false);
    expect(interpreted.detail).toContain("not treating this as a verified computation");
  });

  it("treats a synthetic payload with the prover verify line and fixture as verified", () => {
    const interpreted = interpretDvcResult({
      payload: {
        status: "done",
        result: "Successfully generated proof!\nSuccessfully verified proof!\nSuccessfully saved proof!\n",
        proof_fixture: JSON.stringify({
          vk: "0xvk",
          proof: "0xproof",
          proof_id: "",
          public_values: "0xpublic",
        }),
      },
    });
    expect(interpreted.proverVerified).toBe(true);
    expect(interpreted.proofPresent).toBe(true);
    expect(interpreted.publicValues).toBe("0xpublic");
    expect(interpreted.detail).toContain("Successfully verified proof!");
    expect(interpreted.detail).toContain("did not re-run an SP1 verifier");
  });
});
