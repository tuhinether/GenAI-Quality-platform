import { describe, expect, it } from "vitest";
import { exactMatchEvaluator } from "./exact-match";

describe("exactMatchEvaluator", () => {
  it("passes on identical primitives", async () => {
    const result = await exactMatchEvaluator.evaluate({
      input: "q",
      actualOutput: "42",
      expectedOutput: "42",
    });
    expect(result.passed).toBe(true);
  });

  it("passes on deep-equal objects regardless of key order", async () => {
    const result = await exactMatchEvaluator.evaluate({
      input: "q",
      actualOutput: { a: 1, b: 2 },
      expectedOutput: { b: 2, a: 1 },
    });
    expect(result.passed).toBe(true);
  });

  it("fails on mismatched values", async () => {
    const result = await exactMatchEvaluator.evaluate({
      input: "q",
      actualOutput: "42",
      expectedOutput: "43",
    });
    expect(result.passed).toBe(false);
  });
});
