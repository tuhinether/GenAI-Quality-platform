import { describe, expect, it } from "vitest";
import { numericGroundingEvaluator } from "./numeric-grounding";

const sourceDocument =
  "Item 7. Q3 2025 net revenue was $128.4 million, up from $115.2 million in Q3 2024. " +
  "Operating margin was 22 percent.";

describe("numericGroundingEvaluator", () => {
  it("passes when every figure in the output appears in the source document", async () => {
    const result = await numericGroundingEvaluator.evaluate({
      input: "Summarize Q3 revenue.",
      actualOutput: "Q3 2025 net revenue was $128.4 million, up from $115.2 million a year earlier.",
      metadata: { sourceDocument },
    });
    expect(result.passed).toBe(true);
  });

  it("fails and flags a hallucinated figure not present in the source", async () => {
    const result = await numericGroundingEvaluator.evaluate({
      input: "Summarize Q3 revenue.",
      actualOutput: "Q3 2025 net revenue was $250 million, a new record.",
      metadata: { sourceDocument },
    });
    expect(result.passed).toBe(false);
    expect(result.metadata?.ungrounded).toContain(250);
  });

  it("returns a null score when no source document is provided", async () => {
    const result = await numericGroundingEvaluator.evaluate({
      input: "q",
      actualOutput: "$250 million",
    });
    expect(result.score).toBeNull();
    expect(result.passed).toBe(false);
  });
});
