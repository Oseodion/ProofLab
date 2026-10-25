import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttestStudio } from "@/components/attest-studio";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const UUID = "2e3160ae-8b1e-45e3-8c59-426366278b9d";

afterEach(() => {
  cleanup();
});

describe("AttestStudio template default", () => {
  it("leaves Template ID empty when no default is configured", () => {
    render(<AttestStudio defaultTemplateId="" />);

    const templateId = screen.getByLabelText("Template ID");
    expect(templateId).toHaveValue("");
    expect(templateId).toHaveAttribute("placeholder", UUID);
    expect(screen.getByRole("link", { name: "Primus marketplace" })).toHaveAttribute(
      "href",
      "https://dev.primuslabs.xyz/marketplace",
    );
    expect(screen.getByRole("link", { name: "Dev Hub project" })).toHaveAttribute(
      "href",
      "https://dev.primuslabs.xyz/myDevelopment/myProjects",
    );
    expect(screen.getByText(/Keys come from the chosen template/)).toBeInTheDocument();
    const tlsHelp = screen.getByText(/standard TLS via proxy/).closest("p");
    expect(tlsHelp?.textContent?.replace(/\s+/g, " ")).toMatch(
      /proxytls is standard TLS via proxy \(the default, used by the production example\)\. mpctls is MPC-TLS\./,
    );
    expect(screen.getByRole("link", { name: "production example" })).toHaveAttribute(
      "href",
      "https://github.com/primus-labs/zktls-demo/tree/main/production-example",
    );
  });

  it("prefills Template ID when a UUID default is provided", () => {
    render(<AttestStudio defaultTemplateId={UUID} />);
    expect(screen.getByLabelText("Template ID")).toHaveValue(UUID);
  });
});
