import type { Evaluator, EvaluatorContext, EvaluatorInput } from "../types";
import { toText } from "../util";

const DEFAULT_RUBRIC =
  "Judge whether the ACTUAL output correctly and completely answers the INPUT, " +
  "consistent with the EXPECTED output where one is provided. Be strict about factual accuracy.";

function buildPrompt(input: EvaluatorInput): string {
  const rubric = (input.metadata?.rubric as string | undefined) ?? DEFAULT_RUBRIC;
  return [
    `You are an evaluator judging an AI system's output. ${rubric}`,
    "",
    `INPUT:\n${toText(input.input)}`,
    `ACTUAL OUTPUT:\n${toText(input.actualOutput)}`,
    input.expectedOutput !== undefined ? `EXPECTED OUTPUT:\n${toText(input.expectedOutput)}` : "",
    "",
    'Respond with ONLY a JSON object: {"score": <0-1 float>, "passed": <boolean>, "reasoning": "<one sentence>"}',
  ]
    .filter(Boolean)
    .join("\n");
}

function parseJudgeResponse(raw: string): { score: number; passed: boolean; reasoning: string } {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`LLM judge response was not JSON: ${raw}`);
  const parsed = JSON.parse(jsonMatch[0]) as { score?: number; passed?: boolean; reasoning?: string };
  if (typeof parsed.score !== "number" || typeof parsed.passed !== "boolean") {
    throw new Error(`LLM judge response missing score/passed: ${raw}`);
  }
  return { score: parsed.score, passed: parsed.passed, reasoning: parsed.reasoning ?? "" };
}

/**
 * Generic LLM-as-judge evaluator. Requires an `llmJudge` function on the
 * EvaluatorContext so it stays swappable/testable — production code wires it
 * to a real model call (see apps/web/src/lib/llm-judge.ts), tests pass a fake.
 */
export const llmJudgeEvaluator: Evaluator = {
  name: "llm-judge",
  description: "Uses an LLM to judge output quality against a rubric.",
  async evaluate(input: EvaluatorInput, ctx?: EvaluatorContext) {
    if (!ctx?.llmJudge) {
      return {
        evaluatorName: "llm-judge",
        score: null,
        passed: false,
        reasoning: "No llmJudge function provided in evaluator context.",
      };
    }

    const raw = await ctx.llmJudge(buildPrompt(input));
    try {
      const { score, passed, reasoning } = parseJudgeResponse(raw);
      return { evaluatorName: "llm-judge", score, passed, reasoning };
    } catch (err) {
      return {
        evaluatorName: "llm-judge",
        score: null,
        passed: false,
        reasoning: `Failed to parse judge response: ${(err as Error).message}`,
      };
    }
  },
};
