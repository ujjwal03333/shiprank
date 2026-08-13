import { describe, it, expect } from "vitest";
import { compile } from "../compiler";
import { createMemoryRateLimiter } from "../rate-limiter";

const BOOKING_PROMPT =
  "ok so i want a booking app with supabase where people pick a time slot and pay a deposit with stripe and also get an email after";

describe("compile() integration", () => {
  it.skipIf(!process.env["ANTHROPIC_API_KEY"])(
    "compiles the booking app prompt with a real API call",
    async () => {
      const limiter = createMemoryRateLimiter(5);
      const result = await compile(BOOKING_PROMPT, "integration-test", limiter);

      expect(result).not.toHaveProperty("kind");
      const r = result as Exclude<typeof result, { kind: string }>;

      console.log("\n=== Raw output ===\n");
      console.log(r.raw);
      console.log("\n=== Parsed steps ===\n");
      r.steps.forEach((s) => {
        console.log(`--- Step ${s.index}: ${s.name} ---`);
        console.log("STACK:", s.stack);
        console.log("BUILD:", s.build);
        console.log("CONSTRAINTS:", s.constraints);
        console.log("OUTPUT:", s.output);
        console.log();
      });

      expect(r.steps.length).toBeGreaterThanOrEqual(1);
      expect(r.detectedStack).toEqual(expect.arrayContaining(["supabase", "stripe"]));

      // Every step must have the stack-aware security baseline: universal
      // constraints plus everything applicable to the detected stack.
      for (const step of r.steps) {
        const c = step.constraints.toLowerCase();
        expect(c).toContain("rls");
        expect(c).toContain("webhook signature");
        expect(c).toContain("zod");
        expect(c).toContain("error boundar");
      }

      expect(r.rateLimit.allowed).toBe(true);
    },
    120_000,
  );
});
