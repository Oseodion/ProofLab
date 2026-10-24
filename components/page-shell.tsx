import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="font-mono text-xs tracking-wide text-primary">{eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{lede}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
