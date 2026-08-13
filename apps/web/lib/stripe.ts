import Stripe from "stripe";

export type PaidPlan = "pro" | "monitor";

export const PLAN_PRICING: Record<PaidPlan, { name: string; amountCents: number }> = {
  pro: { name: "ShipRank Pro", amountCents: 1900 },
  monitor: { name: "ShipRank Monitor", amountCents: 3900 },
};

function makeClient(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

let _client: Stripe | null | undefined;

export function getStripeClient(): Stripe {
  if (_client === undefined) _client = makeClient();
  if (!_client) {
    throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY.");
  }
  return _client;
}

export function isStripeConfigured(): boolean {
  return !!process.env["STRIPE_SECRET_KEY"];
}

export function isStripeWebhookConfigured(): boolean {
  return !!process.env["STRIPE_WEBHOOK_SECRET"];
}
