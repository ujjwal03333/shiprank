import { describe, it, expect } from "vitest";
import {
  cardPath,
  cardUrl,
  dareUrl,
  isForeignShiprankHost,
  safePublicOrigin,
} from "../public-url";

describe("isForeignShiprankHost", () => {
  it("rejects shiprank.dev", () => {
    expect(isForeignShiprankHost("https://shiprank.dev")).toBe(true);
    expect(isForeignShiprankHost("https://www.shiprank.dev/dare")).toBe(true);
  });

  it("allows the host we control", () => {
    expect(
      isForeignShiprankHost("https://shiprank-web-cqm7.vercel.app"),
    ).toBe(false);
    expect(isForeignShiprankHost("http://localhost:3000")).toBe(false);
  });
});

describe("production origin safety", () => {
  it("treats a configured shiprank.dev env as foreign even with a path", () => {
    expect(isForeignShiprankHost("https://shiprank.dev/api/scan")).toBe(true);
  });

  it("safePublicOrigin never returns shiprank.dev", () => {
    const safe = safePublicOrigin("https://shiprank.dev/dare");
    expect(safe).not.toContain("shiprank.dev");
    expect(cardUrl("abc", "https://shiprank.dev")).not.toContain("shiprank.dev");
    expect(dareUrl("https://www.shiprank.dev")).not.toContain("shiprank.dev");
  });
});

describe("card + dare urls", () => {
  it("builds the public Card route", () => {
    expect(cardPath("abc")).toBe("/s/abc");
    expect(cardUrl("abc", "https://example.com")).toBe(
      "https://example.com/s/abc",
    );
  });

  it("builds the dare url", () => {
    expect(dareUrl("https://example.com/")).toBe("https://example.com/dare");
  });
});
