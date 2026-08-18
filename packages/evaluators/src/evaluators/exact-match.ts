import type { Evaluator } from "../types";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

export const exactMatchEvaluator: Evaluator = {
  name: "exact-match",
  description: "Passes when actualOutput deep-equals expectedOutput.",
  evaluate({ actualOutput, expectedOutput }) {
    const passed = deepEqual(actualOutput, expectedOutput);
    return {
      evaluatorName: "exact-match",
      score: passed ? 1 : 0,
      passed,
      reasoning: passed ? "Output matches expected value exactly." : "Output does not match expected value.",
    };
  },
};
