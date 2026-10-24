import { connection } from "next/server";

export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function bindRequest(): Promise<void> {
  await connection();
}
