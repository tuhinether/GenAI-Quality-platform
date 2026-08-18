import type { Evaluator, EvaluatorContext, EvaluatorInput, EvaluatorResult } from "./types";
import {
  citationGroundingEvaluator,
  disclaimerPresenceEvaluator,
  exactMatchEvaluator,
  jsonSchemaValidityEvaluator,
  llmJudgeEvaluator,
  numericGroundingEvaluator,
  numericToleranceEvaluator,
  piiMnpiLeakageEvaluator,
} from "./evaluators";

const builtIns: Evaluator[] = [
  exactMatchEvaluator,
  numericToleranceEvaluator,
  jsonSchemaValidityEvaluator,
  llmJudgeEvaluator,
  numericGroundingEvaluator,
  citationGroundingEvaluator,
  piiMnpiLeakageEvaluator,
  disclaimerPresenceEvaluator,
];

const registry = new Map<string, Evaluator>(builtIns.map((e) => [e.name, e]));

export function registerEvaluator(evaluator: Evaluator): void {
  registry.set(evaluator.name, evaluator);
}

export function getEvaluator(name: string): Evaluator | undefined {
  return registry.get(name);
}

export function listEvaluators(): Evaluator[] {
  return [...registry.values()];
}

export async function runEvaluators(
  names: string[],
  input: EvaluatorInput,
  ctx?: EvaluatorContext,
): Promise<EvaluatorResult[]> {
  const results: EvaluatorResult[] = [];
  for (const name of names) {
    const evaluator = registry.get(name);
    if (!evaluator) {
      results.push({
        evaluatorName: name,
        score: null,
        passed: false,
        reasoning: `Unknown evaluator: ${name}`,
      });
      continue;
    }
    results.push(await evaluator.evaluate(input, ctx));
  }
  return results;
}
