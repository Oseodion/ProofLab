import type { ReactNode } from "react";

export function Callout({
  title,
  children,
  tone = "neutral",
}: {
  title?: string;
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const border =
    tone === "danger" ? "border-failed/50" : tone === "warning" ? "border-unverified/50" : "border-border";
  return (
    <aside className={`rounded-lg border ${border} bg-card px-4 py-3 text-sm leading-6`}>
      {title ? <p className="font-medium text-foreground">{title}</p> : null}
      <div className={title ? "mt-1 text-muted-foreground" : "text-muted-foreground"}>{children}</div>
    </aside>
  );
}
