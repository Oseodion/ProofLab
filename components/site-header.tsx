"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Workflow" },
  { href: "/attest", label: "Attest" },
  { href: "/history", label: "History" },
  { href: "/compute", label: "Compute" },
  { href: "/trust", label: "Trust" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          ProofLab
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav aria-label="Primary" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
