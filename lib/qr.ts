import { nanoid } from "nanoid";

const TOKEN_LENGTH = 21; // nanoid default

export function generateQrToken(): string {
  return nanoid(TOKEN_LENGTH);
}

export function buildQrUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base.replace(/\/$/, "")}/location-access/${token}`;
}
