import type { Evaluator } from "../types";
import { extractNumbers, toText } from "../util";

const DEFAULT_TOLERANCE_RATIO = 0.005; // 0.5%
const DEFAULT_MIN_MAGNITUDE = 10; // ignore small integers (citation markers, list numbers, etc.)

/**
 * Finance-specific evaluator: every figure the agent states must be traceable
 * back to `metadata.sourceDocument` (e.g. the SEC filing / market data snippet
 * the agent was given). Any number in the output that has no match in the
 * source within tolerance is flagged as a potential hallucinated figure —
 * the single highest-value check for a finance research/reporting agent.
 */
export const numericGroundingEvaluator: Evaluator = {
  name: "numeric-grounding",
  description: "Flags numbers in actualOutput that cannot be traced back to metadata.sourceDocument.",
  evaluate({ actualOutput, metadata }) {
    const source = metadata?.sourceDocument;
    if (typeof source !== "string" || source.trim().length === 0) {
      return {
        evaluatorName: "numeric-grounding",
        score: null,
        passed: false,
        reasoning: "No source document provided in metadata.sourceDocument; cannot verify grounding.",
      };
    }

    const toleranceRatio =
      typeof metadata?.toleranceRatio === "number" ? metadata.toleranceRatio : DEFAULT_TOLERANCE_RATIO;
    const minMagnitude =
      typeof metadata?.minMagnitude === "number" ? metadata.minMagnitude : DEFAULT_MIN_MAGNITUDE;

    const sourceNumbers = extractNumbers(source);
    const outputNumbers = extractNumbers(toText(actualOutput)).filter(
      (n) => Math.abs(n) >= minMagnitude,
    );

    const ungrounded = outputNumbers.filter((n) => {
      const tolerance = Math.abs(n) * toleranceRatio;
      return !sourceNumbers.some((s) => Math.abs(s - n) <= tolerance);
    });

    const passed = ungrounded.length === 0;

    return {
      evaluatorName: "numeric-grounding",
      score: outputNumbers.length === 0 ? 1 : 1 - ungrounded.length / outputNumbers.length,
      passed,
      reasoning: passed
        ? `All ${outputNumbers.length} figure(s) in the output are traceable to the source document.`
        : `${ungrounded.length} figure(s) not found in the source document: [${ungrounded.join(", ")}]. Possible hallucination.`,
      metadata: { outputNumbers, sourceNumbers, ungrounded },
    };
  },
};
