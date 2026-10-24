export function formatUnknownError(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : null;
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (code && message) return `${code}: ${message}`;
    if (message) return message;
    if (code) return `Attestation error ${code}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Something went wrong.";
}

export function redactSecret(message: string, secret: string | undefined): string {
  if (!secret) return message;
  return message.split(secret).join("[redacted]");
}
