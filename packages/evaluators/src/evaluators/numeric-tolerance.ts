import type { Evaluator } from "../types";
import { extractNumbers, toText } from "../util";

const DEFAULT_TOLERANCE_RATIO = 0.01; // 1%

function toExpectedNumber(expectedOutput: unknown): number | null {
  if (typeof expectedOutput === "number") return expectedOutput;
  if (typeof expectedOutput === "string") {
    const nums = extractNumbers(expectedOutput);
    return nums[0] ?? null;
  }
  if (expectedOutput && typeof expectedOutput === "object" && "value" in expectedOutput) {
    return toExpectedNumber((expectedOutput as { value: unknown }).value);
  }
  return null;
}

/**
 * Passes if any number found in actualOutput is within `toleranceRatio` (metadata,
 * default 1%) of the expected numeric value. Useful for financial figures where
 * exact string match is too strict but the number still has to be materially correct.
 */
export const numericToleranceEvaluator: Evaluator = {
  name: "numeric-tolerance",
  description: "Passes when a number in actualOutput is within tolerance of expectedOutput.",
  evaluate({ actualOutput, expectedOutput, metadata }) {
    const expected = toExpectedNumber(expectedOutput);
    if (expected === null) {
      return {
        evaluatorName: "numeric-tolerance",
        score: null,
        passed: false,
        reasoning: "No numeric expected value could be parsed.",
      };
    }

    const toleranceRatio =
      typeof metadata?.toleranceRatio === "number" ? metadata.toleranceRatio : DEFAULT_TOLERANCE_RATIO;
    const candidates = extractNumbers(toText(actualOutput));
    const tolerance = Math.abs(expected) * toleranceRatio;

    const match = candidates.find((n) => Math.abs(n - expected) <= tolerance);
    const passed = match !== undefined;

    return {
      evaluatorName: "numeric-tolerance",
      score: passed ? 1 : 0,
      passed,
      reasoning: passed
        ? `Found ${match} within ${(toleranceRatio * 100).toFixed(2)}% of expected ${expected}.`
        : `No number in output within ${(toleranceRatio * 100).toFixed(2)}% of expected ${expected}. Candidates: [${candidates.join(", ")}]`,
      metadata: { expected, candidates },
    };
  },
};
