import { describe, it, expect } from "vitest";
import { lockedTweet, tweetIntentUrl } from "../tweet";

describe("lockedTweet", () => {
  it("uses the locked three-line template", () => {
    const text = lockedTweet({
      name: "booking-saas",
      score: 61,
      grade: "C",
      origin: "https://example.com",
    });
    expect(text).toBe(
      "booking-saas is a C (61).\nI dare you to beat it.\nhttps://example.com/dare",
    );
  });

  it("never mentions shiprank.dev", () => {
    const text = lockedTweet({
      name: "x",
      score: 12,
      grade: "F",
      origin: "https://shiprank-web-cqm7.vercel.app",
    });
    expect(text).not.toContain("shiprank.dev");
  });

  it("rewrites a shiprank.dev origin instead of tweeting it", () => {
    const text = lockedTweet({
      name: "x",
      score: 12,
      grade: "F",
      origin: "https://shiprank.dev",
    });
    expect(text).not.toContain("shiprank.dev");
    expect(text).toContain("I dare you to beat it.");
  });
});

describe("tweetIntentUrl", () => {
  it("encodes the locked body", () => {
    const url = tweetIntentUrl("hello\nworld");
    expect(url).toContain("https://x.com/intent/tweet?text=");
    expect(url).toContain(encodeURIComponent("hello\nworld"));
  });
});
