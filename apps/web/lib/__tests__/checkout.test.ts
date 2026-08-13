import { describe, it, expect } from "vitest";
import { buildCheckoutSessionParams } from "../checkout";

describe("buildCheckoutSessionParams", () => {
  it("prices the Pro plan at $19/mo", () => {
    const params = buildCheckoutSessionParams("pro", "a@b.com", "https://shiprank.dev");
    const lineItem = params.line_items![0]!;
    expect(lineItem.price_data!.unit_amount).toBe(1900);
    expect(lineItem.price_data!.recurring).toEqual({ interval: "month" });
    expect(lineItem.price_data!.product_data!.name).toBe("ShipRank Pro");
  });

  it("prices the Monitor plan at $39/mo", () => {
    const params = buildCheckoutSessionParams("monitor", "a@b.com", "https://shiprank.dev");
    expect(params.line_items![0]!.price_data!.unit_amount).toBe(3900);
  });

  it("carries the plan through metadata so the webhook can read it back", () => {
    const params = buildCheckoutSessionParams("pro", "a@b.com", "https://shiprank.dev");
    expect(params.metadata).toEqual({ plan: "pro" });
  });

  it("builds success/cancel URLs off the given app URL", () => {
    const params = buildCheckoutSessionParams("pro", "a@b.com", "https://shiprank.dev");
    expect(params.success_url).toBe("https://shiprank.dev/pricing?checkout=success");
    expect(params.cancel_url).toBe("https://shiprank.dev/pricing?checkout=cancelled");
  });

  it("passes the customer email through for Stripe to attach", () => {
    const params = buildCheckoutSessionParams("monitor", "buyer@example.com", "https://shiprank.dev");
    expect(params.customer_email).toBe("buyer@example.com");
  });

  it("is a subscription-mode session", () => {
    const params = buildCheckoutSessionParams("pro", "a@b.com", "https://shiprank.dev");
    expect(params.mode).toBe("subscription");
  });
});
