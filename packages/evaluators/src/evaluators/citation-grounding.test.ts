import { describe, expect, it } from "vitest";
import { citationGroundingEvaluator } from "./citation-grounding";

const sources = [
  { id: "S1", text: "10-Q filing, Item 7, Q3 2025." },
  { id: "S2", text: "Investor presentation, slide 4." },
];

describe("citationGroundingEvaluator", () => {
  it("passes when all citations resolve to a provided source", async () => {
    const result = await citationGroundingEvaluator.evaluate({
      input: "q",
      actualOutput: "Revenue grew 12% [S1], driven by enterprise demand [S2].",
      metadata: { sources },
    });
    expect(result.passed).toBe(true);
  });

  it("fails when a citation references an unknown source id", async () => {
    const result = await citationGroundingEvaluator.evaluate({
      input: "q",
      actualOutput: "Revenue grew 12% [S1] and margins improved [S9].",
      metadata: { sources },
    });
    expect(result.passed).toBe(false);
    expect(result.metadata?.fabricated).toContain("S9");
  });

  it("fails when sources are provided but the output has no citations", async () => {
    const result = await citationGroundingEvaluator.evaluate({
      input: "q",
      actualOutput: "Revenue grew 12%.",
      metadata: { sources },
    });
    expect(result.passed).toBe(false);
  });
});
