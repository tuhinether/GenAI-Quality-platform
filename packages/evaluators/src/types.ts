export interface EvaluatorInput {
  /** The input given to the system under test (dataset example input, or trace input). */
  input: unknown;
  /** What the system under test actually produced. */
  actualOutput: unknown;
  /** The golden/expected output, when available (dataset examples have this; live traces usually don't). */
  expectedOutput?: unknown;
  /** Free-form context: source documents, citation lists, required disclaimers, etc. */
  metadata?: Record<string, unknown>;
}

export interface EvaluatorResult {
  evaluatorName: string;
  /** Normalized 0..1 score, or null when the evaluator only produces a pass/fail verdict. */
  score: number | null;
  passed: boolean;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}

/** Injected so evaluators that need a judge model stay pure/testable — pass a fake in tests. */
export type LlmJudge = (prompt: string) => Promise<string>;

export interface EvaluatorContext {
  llmJudge?: LlmJudge;
}

export interface Evaluator {
  name: string;
  description: string;
  evaluate(input: EvaluatorInput, ctx?: EvaluatorContext): Promise<EvaluatorResult> | EvaluatorResult;
}
