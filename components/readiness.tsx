"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { publicPrimusAppId } from "@/lib/client/browser-primus";
import { links } from "@/lib/links";
import { ExternalLink } from "@/components/external-link";

type PrimusStatus = {
  ready?: boolean;
  missing?: string[];
  appIdMatches?: boolean | null;
  message?: string;
};

type DvcStatus = {
  configured?: boolean;
  missing?: string[];
  message?: string;
};

export function Readiness() {
  const appId = publicPrimusAppId();
  const [primus, setPrimus] = useState<PrimusStatus | null>(null);
  const [dvc, setDvc] = useState<DvcStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [primusRes, dvcRes] = await Promise.all([
          fetch("/api/primus/status"),
          fetch("/api/dvc/status"),
        ]);
        const primusBody = (await primusRes.json()) as PrimusStatus;
        const dvcBody = (await dvcRes.json()) as DvcStatus;
        if (!cancelled) {
          setPrimus(primusBody);
          setDvc(dvcBody);
        }
      } catch {
        if (!cancelled) setError("Could not read server configuration.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-3" aria-label="Configuration">
      <h2 className="text-sm font-medium">Configuration on this deployment</h2>
      {error ? <p className="text-sm text-failed">{error}</p> : null}
      <ul className="divide-y divide-border border-y border-border">
        <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm">Browser App ID</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {appId
                ? `NEXT_PUBLIC_PRIMUS_APP_ID=${appId}`
                : "Missing environment variable: NEXT_PUBLIC_PRIMUS_APP_ID"}
            </p>
          </div>
          {appId ? (
            <span className="font-mono text-xs text-muted-foreground">Present</span>
          ) : (
            <StatusPill status="unavailable" />
          )}
        </li>
        <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm">Server signing</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {primus?.message ?? "Checking PRIMUS_APP_ID and PRIMUS_APP_SECRET…"}
            </p>
            {primus?.appIdMatches === false ? (
              <p className="mt-1 text-sm text-unverified">
                NEXT_PUBLIC_PRIMUS_APP_ID and PRIMUS_APP_ID differ. Signing will reject the request.
              </p>
            ) : null}
          </div>
          {primus?.ready ? (
            <span className="font-mono text-xs text-muted-foreground">Ready</span>
          ) : (
            <StatusPill status={primus ? "unavailable" : "pending"} />
          )}
        </li>
        <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm">DVC service</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {dvc?.message ?? "Checking DVC_SERVICE_URL…"}
            </p>
          </div>
          {dvc?.configured ? (
            <span className="font-mono text-xs text-muted-foreground">Set</span>
          ) : (
            <StatusPill status={dvc ? "unavailable" : "pending"} />
          )}
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        App ID and App Secret come from{" "}
        <ExternalLink href={links.devHubProjects}>Dev Hub projects</ExternalLink>. Template IDs come
        from the <ExternalLink href={links.marketplace}>template marketplace</ExternalLink>.
      </p>
    </section>
  );
}
