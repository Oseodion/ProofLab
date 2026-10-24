"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function JsonBlock({ value, label }: { value: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2) ?? "null";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>
      <pre className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-5 text-foreground">
        {text}
      </pre>
    </div>
  );
}
