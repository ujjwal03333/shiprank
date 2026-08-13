import type Stripe from "stripe";
import { PLAN_PRICING, type PaidPlan } from "./stripe";

/**
 * Pure builder for the Stripe Checkout session params — no network I/O, so
 * the plan → price mapping and URL shape are unit-testable without a real
 * Stripe account. The route just calls stripe.checkout.sessions.create(...)
 * with this.
 */
export function buildCheckoutSessionParams(
  plan: PaidPlan,
  email: string,
  appUrl: string,
): Stripe.Checkout.SessionCreateParams {
  const pricing = PLAN_PRICING[plan];

  return {
    mode: "subscription",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: pricing.amountCents,
          recurring: { interval: "month" },
          product_data: { name: pricing.name },
        },
        quantity: 1,
      },
    ],
    metadata: { plan },
    success_url: `${appUrl}/pricing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
  };
}
