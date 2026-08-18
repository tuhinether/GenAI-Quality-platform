import { describe, expect, it } from "vitest";
import { disclaimerPresenceEvaluator } from "./disclaimer-presence";

describe("disclaimerPresenceEvaluator", () => {
  it("passes trivially when no advice language is used", async () => {
    const result = await disclaimerPresenceEvaluator.evaluate({
      input: "q",
      actualOutput: "Q3 revenue was $128.4 million.",
    });
    expect(result.passed).toBe(true);
  });

  it("fails when advice language is used without a disclaimer", async () => {
    const result = await disclaimerPresenceEvaluator.evaluate({
      input: "q",
      actualOutput: "Given the growth trend, you should buy this stock now.",
    });
    expect(result.passed).toBe(false);
  });

  it("passes when advice language is paired with a disclaimer", async () => {
    const result = await disclaimerPresenceEvaluator.evaluate({
      input: "q",
      actualOutput: "You should buy this stock. This is not financial advice — consult a licensed financial advisor.",
    });
    expect(result.passed).toBe(true);
  });
});
