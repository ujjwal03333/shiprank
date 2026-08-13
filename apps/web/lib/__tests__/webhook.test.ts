import { describe, it, expect } from "vitest";
import { interpretWebhookEvent } from "../webhook";

describe("interpretWebhookEvent — checkout.session.completed", () => {
  it("extracts customer id, email, and plan from a real-shaped session", () => {
    const action = interpretWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          customer_email: "buyer@example.com",
          metadata: { plan: "pro" },
        },
      },
    });
    expect(action).toEqual({
      type: "checkout_completed",
      customerId: "cus_123",
      customerEmail: "buyer@example.com",
      plan: "pro",
    });
  });

  it("falls back to customer_details.email when customer_email is absent", () => {
    const action = interpretWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_456",
          customer_details: { email: "other@example.com" },
          metadata: { plan: "monitor" },
        },
      },
    });
    expect(action).toMatchObject({
      type: "checkout_completed",
      customerEmail: "other@example.com",
      plan: "monitor",
    });
  });

  it("ignores a session with no plan in metadata", () => {
    const action = interpretWebhookEvent({
      type: "checkout.session.completed",
      data: { object: { customer: "cus_123", customer_email: "a@b.com", metadata: {} } },
    });
    expect(action).toEqual({ type: "ignored", eventType: "checkout.session.completed" });
  });

  it("ignores a session with an invalid plan value", () => {
    const action = interpretWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          customer_email: "a@b.com",
          metadata: { plan: "enterprise" },
        },
      },
    });
    expect(action.type).toBe("ignored");
  });
});

describe("interpretWebhookEvent — customer.subscription.deleted", () => {
  it("extracts the customer id to cancel", () => {
    const action = interpretWebhookEvent({
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_789" } },
    });
    expect(action).toEqual({ type: "subscription_deleted", customerId: "cus_789" });
  });
});

describe("interpretWebhookEvent — unhandled events", () => {
  it("ignores event types this webhook doesn't act on", () => {
    const action = interpretWebhookEvent({
      type: "invoice.paid",
      data: { object: {} },
    });
    expect(action).toEqual({ type: "ignored", eventType: "invoice.paid" });
  });
});
