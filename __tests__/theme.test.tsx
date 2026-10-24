import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_STORAGE_KEY, parseStoredTheme } from "@/lib/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add("dark");
  });

  it("defaults a missing or unknown preference to dark", () => {
    expect(parseStoredTheme(null)).toBe("dark");
    expect(parseStoredTheme("")).toBe("dark");
    expect(parseStoredTheme("sepia")).toBe("dark");
    expect(parseStoredTheme("light")).toBe("light");
  });

  it("toggles the class and localStorage from the keyboard-operable switch", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("switch", { name: "Switch to light theme" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle.tagName).toBe("BUTTON");

    fireEvent.click(toggle);

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByRole("switch", { name: "Switch to dark theme" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
