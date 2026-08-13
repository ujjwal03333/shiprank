import type { Plan } from "./plan-gating";

/**
 * Pure interpretation of a (already signature-verified) Stripe event into a
 * normalized action the route can act on. No Stripe SDK types required here
 * — just the shape we read — so this is testable with plain object fixtures,
 * matching how the rest of this codebase keeps business logic pure and I/O
 * at the edges.
 */
export type WebhookAction =
  | {
      type: "checkout_completed";
      customerId: string;
      customerEmail: string;
      plan: Plan;
    }
  | { type: "subscription_deleted"; customerId: string }
  | { type: "ignored"; eventType: string };

interface StripeEventLike {
  type: string;
  data: { object: Record<string, unknown> };
}

const VALID_PLANS: ReadonlySet<string> = new Set(["pro", "monitor"]);

export function interpretWebhookEvent(event: StripeEventLike): WebhookAction {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerId = session["customer"];
    const customerEmail = session["customer_email"] ?? session["customer_details"];
    const metadata = session["metadata"] as Record<string, unknown> | undefined;
    const plan = metadata?.["plan"];

    const email =
      typeof customerEmail === "string"
        ? customerEmail
        : ((customerEmail as { email?: string } | undefined)?.email ?? null);

    if (
      typeof customerId !== "string" ||
      !email ||
      typeof plan !== "string" ||
      !VALID_PLANS.has(plan)
    ) {
      return { type: "ignored", eventType: event.type };
    }

    return {
      type: "checkout_completed",
      customerId,
      customerEmail: email,
      plan: plan as Plan,
    };
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription["customer"];
    if (typeof customerId !== "string") {
      return { type: "ignored", eventType: event.type };
    }
    return { type: "subscription_deleted", customerId };
  }

  return { type: "ignored", eventType: event.type };
}
