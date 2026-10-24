"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, subscribeTheme, type ThemeChoice } from "@/lib/theme";

function serverTheme(): ThemeChoice {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => applyTheme(dark ? "light" : "dark")}
      className="h-8 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground"
    >
      {dark ? "Dark" : "Light"}
    </button>
  );
}
