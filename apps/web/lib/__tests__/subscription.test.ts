import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  isValidApiKeyFormat,
  extractApiKey,
  API_KEY_PREFIX,
} from "../subscription";

describe("generateApiKey", () => {
  it("produces shiprank_live_ + 48 hex chars", () => {
    const key = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(isValidApiKeyFormat(key)).toBe(true);
  });

  it("is unique across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).not.toBe(b);
  });
});

describe("isValidApiKeyFormat", () => {
  it("rejects malformed keys", () => {
    expect(isValidApiKeyFormat("not_a_key")).toBe(false);
    expect(isValidApiKeyFormat("shiprank_live_tooshort")).toBe(false);
    expect(isValidApiKeyFormat("shiprank_test_" + "a".repeat(48))).toBe(false);
  });
});

describe("extractApiKey", () => {
  const validKey = generateApiKey();

  it("reads a valid key from the Authorization Bearer header", () => {
    const req = new Request("http://x", {
      headers: { authorization: `Bearer ${validKey}` },
    });
    expect(extractApiKey(req)).toBe(validKey);
  });

  it("ignores a malformed bearer token", () => {
    const req = new Request("http://x", {
      headers: { authorization: "Bearer garbage" },
    });
    expect(extractApiKey(req)).toBeNull();
  });

  it("falls back to the session cookie when no header is present", () => {
    const req = new Request("http://x", {
      headers: { cookie: `theme=dark; shiprank_api_key=${validKey}; other=1` },
    });
    expect(extractApiKey(req)).toBe(validKey);
  });

  it("returns null when neither header nor cookie is present", () => {
    const req = new Request("http://x");
    expect(extractApiKey(req)).toBeNull();
  });

  it("prefers the Authorization header over the cookie", () => {
    const otherKey = generateApiKey();
    const req = new Request("http://x", {
      headers: {
        authorization: `Bearer ${validKey}`,
        cookie: `shiprank_api_key=${otherKey}`,
      },
    });
    expect(extractApiKey(req)).toBe(validKey);
  });
});
