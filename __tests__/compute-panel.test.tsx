import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComputePanel } from "@/components/compute-panel";

describe("ComputePanel availability", () => {
  it("renders Unavailable for a missing DVC_SERVICE_URL without waiting on the client fetch", () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    render(
      <ComputePanel
        initialAvailability={{
          configured: false,
          missing: ["DVC_SERVICE_URL"],
          message: "DVC submit is unavailable. Missing environment variable: DVC_SERVICE_URL.",
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-status", "unavailable");
    expect(screen.getAllByText(/Missing environment variable: DVC_SERVICE_URL/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Submit task" })).toBeDisabled();
  });
});
