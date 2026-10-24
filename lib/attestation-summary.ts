export type SummaryRow = { label: string; value: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function shorten(value: string, max = 160): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function summarizeAttestation(value: unknown): SummaryRow[] {
  if (!isRecord(value)) return [];

  const rows: SummaryRow[] = [];
  const recipient = text(value.recipient);
  if (recipient) rows.push({ label: "Recipient", value: recipient });

  if (isRecord(value.request)) {
    const url = text(value.request.url);
    const method = text(value.request.method);
    if (method) rows.push({ label: "Request method", value: method });
    if (url) rows.push({ label: "Request URL", value: url });
  }

  const resolves = Array.isArray(value.reponseResolve)
    ? value.reponseResolve
    : Array.isArray(value.responseResolve)
      ? value.responseResolve
      : null;
  if (resolves) {
    const names = resolves
      .map((item) => (isRecord(item) ? text(item.keyName) : null))
      .filter((item): item is string => Boolean(item));
    rows.push({
      label: "Response resolves",
      value: names.length > 0 ? names.join(", ") : `${resolves.length} item(s)`,
    });
  }

  if (typeof value.timestamp === "number" && Number.isFinite(value.timestamp)) {
    const ms = value.timestamp < 1e12 ? value.timestamp * 1000 : value.timestamp;
    const iso = Number.isNaN(new Date(ms).getTime()) ? String(value.timestamp) : new Date(ms).toISOString();
    rows.push({ label: "Attestor timestamp", value: iso });
  }

  if (Array.isArray(value.attestors)) {
    const addrs = value.attestors
      .map((item) => (isRecord(item) ? text(item.attestorAddr) : null))
      .filter((item): item is string => Boolean(item));
    rows.push({
      label: "Attestors",
      value: addrs.length > 0 ? addrs.join(", ") : `${value.attestors.length} attestor(s)`,
    });
  }

  if (Array.isArray(value.signatures)) {
    rows.push({ label: "Signatures", value: String(value.signatures.length) });
  }

  const data = text(value.data);
  if (data) rows.push({ label: "Revealed data", value: shorten(data) });

  const addition = text(value.additionParams);
  if (addition) rows.push({ label: "Addition params", value: shorten(addition) });

  return rows;
}
