import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredTemplateId, defaultTemplateId } from "@/lib/server/defaults";

vi.mock("next/server", () => ({
  connection: async () => {},
}));

const UUID = "2e3160ae-8b1e-45e3-8c59-426366278b9d";

describe("configuredTemplateId", () => {
  it("treats blank values and the MISSING sentinel as unset", () => {
    expect(configuredTemplateId(undefined)).toBeUndefined();
    expect(configuredTemplateId(null)).toBeUndefined();
    expect(configuredTemplateId("")).toBeUndefined();
    expect(configuredTemplateId("   ")).toBeUndefined();
    expect(configuredTemplateId("MISSING")).toBeUndefined();
    expect(configuredTemplateId(" missing ")).toBeUndefined();
    expect(configuredTemplateId("TODO")).toBeUndefined();
    expect(configuredTemplateId("placeholder")).toBeUndefined();
  });

  it("keeps a real template UUID", () => {
    expect(configuredTemplateId(`  ${UUID}  `)).toBe(UUID);
  });
});

describe("defaultTemplateId", () => {
  const previous = {
    server: process.env.DEFAULT_ATT_TEMPLATE_ID,
    public: process.env.NEXT_PUBLIC_DEFAULT_TEMPLATE_ID,
  };

  afterEach(() => {
    restore("DEFAULT_ATT_TEMPLATE_ID", previous.server);
    restore("NEXT_PUBLIC_DEFAULT_TEMPLATE_ID", previous.public);
  });

  it("returns an empty string when both defaults are the MISSING sentinel", async () => {
    process.env.DEFAULT_ATT_TEMPLATE_ID = "MISSING";
    process.env.NEXT_PUBLIC_DEFAULT_TEMPLATE_ID = "MISSING";
    expect(await defaultTemplateId()).toBe("");
  });

  it("skips a sentinel and uses the next configured UUID", async () => {
    process.env.DEFAULT_ATT_TEMPLATE_ID = "MISSING";
    process.env.NEXT_PUBLIC_DEFAULT_TEMPLATE_ID = UUID;
    expect(await defaultTemplateId()).toBe(UUID);
  });

  it("prefers DEFAULT_ATT_TEMPLATE_ID when it is a UUID", async () => {
    process.env.DEFAULT_ATT_TEMPLATE_ID = UUID;
    process.env.NEXT_PUBLIC_DEFAULT_TEMPLATE_ID = "MISSING";
    expect(await defaultTemplateId()).toBe(UUID);
  });

  it("returns an empty string when neither variable is set", async () => {
    delete process.env.DEFAULT_ATT_TEMPLATE_ID;
    delete process.env.NEXT_PUBLIC_DEFAULT_TEMPLATE_ID;
    expect(await defaultTemplateId()).toBe("");
  });
});

function restore(
  name: "DEFAULT_ATT_TEMPLATE_ID" | "NEXT_PUBLIC_DEFAULT_TEMPLATE_ID",
  value: string | undefined,
) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
