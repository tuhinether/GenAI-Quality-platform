import { describe, expect, it } from "vitest";
import { llmJudgeEvaluator } from "./llm-judge";

describe("llmJudgeEvaluator", () => {
  it("passes through a well-formed judge response", async () => {
    const result = await llmJudgeEvaluator.evaluate(
      { input: "q", actualOutput: "42" },
      { llmJudge: async () => '{"score": 0.9, "passed": true, "reasoning": "close enough"}' },
    );
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.9);
  });

  it("fails gracefully when the judge response is not parseable", async () => {
    const result = await llmJudgeEvaluator.evaluate(
      { input: "q", actualOutput: "42" },
      { llmJudge: async () => "I think it's fine." },
    );
    expect(result.passed).toBe(false);
    expect(result.score).toBeNull();
  });

  it("returns a null score when no llmJudge is provided", async () => {
    const result = await llmJudgeEvaluator.evaluate({ input: "q", actualOutput: "42" });
    expect(result.score).toBeNull();
    expect(result.passed).toBe(false);
  });
});
