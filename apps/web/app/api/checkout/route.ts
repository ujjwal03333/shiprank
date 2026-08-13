import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { buildCheckoutSessionParams } from "@/lib/checkout";

const BodySchema = z.object({
  plan: z.enum(["pro", "monitor"]),
  email: z.string().email(),
});

const APP_URL = () => process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

/**
 * POST /api/checkout — accepts a plain HTML <form> POST (application/x-www
 * -form-urlencoded) from /pricing, or JSON. Redirects the browser straight
 * to Stripe's hosted checkout page.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error: "Payments not configured",
        message: "Stripe isn't set up on this deployment yet.",
      },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  const params = buildCheckoutSessionParams(parsed.data.plan, parsed.data.email, APP_URL());

  let session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }

  if (!session.url) {
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
