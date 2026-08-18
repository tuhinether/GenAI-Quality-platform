import { runEvaluators } from "@tickmark/evaluators";
import { appendAuditLog, evaluatorResults, experimentRuns, experiments, getDb } from "./db";
import { getLlmJudge } from "./llm-judge";

export interface RunExperimentInput {
  projectId: string;
  datasetId: string;
  name: string;
  description?: string;
  evaluatorNames: string[];
  runs: Array<{
    exampleId: string;
    input: unknown;
    actualOutput: unknown;
    expectedOutput?: unknown;
    traceId?: string;
    latencyMs?: number;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Runs the given evaluator pack against a set of (example, actualOutput) pairs
 * and stores an experiment + per-example evaluator results. The caller (the
 * demo agent, or any instrumented app) is responsible for producing
 * actualOutput by running its own system against each dataset example first —
 * the platform evaluates and records, it doesn't execute arbitrary user code.
 * Exposed over HTTP at POST /api/experiments/run for out-of-process callers.
 */
export async function runExperiment(input: RunExperimentInput) {
  const db = getDb();
  const llmJudge = getLlmJudge();

  const [experiment] = await db
    .insert(experiments)
    .values({
      projectId: input.projectId,
      datasetId: input.datasetId,
      name: input.name,
      description: input.description,
      evaluatorNames: input.evaluatorNames,
    })
    .returning();
  if (!experiment) throw new Error("Failed to create experiment");

  for (const run of input.runs) {
    const [experimentRun] = await db
      .insert(experimentRuns)
      .values({
        experimentId: experiment.id,
        exampleId: run.exampleId,
        traceId: run.traceId,
        actualOutput: run.actualOutput as object,
        latencyMs: run.latencyMs,
      })
      .returning();
    if (!experimentRun) continue;

    const results = await runEvaluators(
      input.evaluatorNames,
      {
        input: run.input,
        actualOutput: run.actualOutput,
        expectedOutput: run.expectedOutput,
        metadata: run.metadata,
      },
      { llmJudge },
    );

    for (const result of results) {
      await db.insert(evaluatorResults).values({
        experimentRunId: experimentRun.id,
        evaluatorName: result.evaluatorName,
        score: result.score,
        passed: result.passed,
        reasoning: result.reasoning,
        metadata: result.metadata,
      });
    }
  }

  await appendAuditLog(db, {
    projectId: input.projectId,
    eventType: "experiment.completed",
    payload: { experimentId: experiment.id, name: input.name, exampleCount: input.runs.length },
  });

  return experiment;
}
