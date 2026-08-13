import { Resend } from "resend";

function makeClient(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  return new Resend(key);
}

let _client: Resend | null | undefined;

export function getResendClient(): Resend {
  if (_client === undefined) _client = makeClient();
  if (!_client) throw new Error("Resend not configured. Set RESEND_API_KEY.");
  return _client;
}

export function isResendConfigured(): boolean {
  return !!process.env["RESEND_API_KEY"];
}

export const ALERT_FROM_ADDRESS = "ShipRank Monitor <monitor@shiprank.dev>";
