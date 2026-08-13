import { NextResponse } from "next/server";
import { getStripeClient, isStripeConfigured, isStripeWebhookConfigured } from "@/lib/stripe";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { generateApiKey } from "@/lib/subscription";
import { interpretWebhookEvent } from "@/lib/webhook";

/**
 * POST /api/webhook — Stripe webhook handler. Verifies the signature, then
 * dispatches on the normalized action from interpretWebhookEvent() (pure,
 * unit-tested separately in lib/__tests__/webhook.test.ts).
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhooks not configured" },
      { status: 503 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env["STRIPE_WEBHOOK_SECRET"]!,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const action = interpretWebhookEvent(event as never);
  const db = getServiceClient();

  if (action.type === "checkout_completed") {
    const apiKey = generateApiKey();
    const { error } = await db.from("subscriptions").upsert(
      {
        user_email: action.customerEmail,
        stripe_customer_id: action.customerId,
        plan: action.plan,
        api_key: apiKey,
        status: "active",
      },
      { onConflict: "stripe_customer_id" },
    );
    if (error) {
      console.error("Failed to create subscription:", error.message);
      return NextResponse.json({ error: "Failed to record subscription" }, { status: 500 });
    }
  } else if (action.type === "subscription_deleted") {
    const { error } = await db
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_customer_id", action.customerId);
    if (error) {
      console.error("Failed to cancel subscription:", error.message);
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
