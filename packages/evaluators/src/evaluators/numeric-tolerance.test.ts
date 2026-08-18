import { describe, expect, it } from "vitest";
import { numericToleranceEvaluator } from "./numeric-tolerance";

describe("numericToleranceEvaluator", () => {
  it("passes when the output number is within tolerance", async () => {
    const result = await numericToleranceEvaluator.evaluate({
      input: "What was Q3 revenue?",
      actualOutput: "Q3 revenue was approximately $128.4 million.",
      expectedOutput: 128.5,
    });
    expect(result.passed).toBe(true);
  });

  it("fails when the output number is outside tolerance", async () => {
    const result = await numericToleranceEvaluator.evaluate({
      input: "What was Q3 revenue?",
      actualOutput: "Q3 revenue was approximately $150 million.",
      expectedOutput: 128.5,
    });
    expect(result.passed).toBe(false);
  });

  it("returns a null score when no expected value can be parsed", async () => {
    const result = await numericToleranceEvaluator.evaluate({
      input: "q",
      actualOutput: "42",
      expectedOutput: undefined,
    });
    expect(result.score).toBeNull();
  });
});
