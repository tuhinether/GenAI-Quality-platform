import { runEvaluators } from "@tickmark/evaluators";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticate-request";
import { appendAuditLog, evaluatorResults, getDb } from "@/lib/db";
import { getLlmJudge } from "@/lib/llm-judge";

interface EvaluateRequestBody {
  traceId: string;
  evaluatorNames: string[];
  input: unknown;
  actualOutput: unknown;
  expectedOutput?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Runs the evaluator pack against a live trace's output and records the
 * results against that trace (evaluatorResults.traceId) rather than an
 * experiment run — this is what feeds the production monitoring dashboard's
 * quality-over-time chart, as opposed to offline dataset experiments.
 */
export async function POST(req: NextRequest) {
  const key = await authenticateRequest(req);
  if (!key) return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as EvaluateRequestBody | null;
  if (!body?.traceId || !body?.evaluatorNames) {
    return NextResponse.json({ error: "Request body must include traceId, evaluatorNames" }, { status: 400 });
  }

  const db = getDb();
  const llmJudge = getLlmJudge();
  const results = await runEvaluators(
    body.evaluatorNames,
    {
      input: body.input,
      actualOutput: body.actualOutput,
      expectedOutput: body.expectedOutput,
      metadata: body.metadata,
    },
    { llmJudge },
  );

  for (const result of results) {
    await db.insert(evaluatorResults).values({
      traceId: body.traceId,
      evaluatorName: result.evaluatorName,
      score: result.score,
      passed: result.passed,
      reasoning: result.reasoning,
      metadata: result.metadata,
    });
  }

  await appendAuditLog(db, {
    projectId: key.projectId,
    traceId: body.traceId,
    eventType: "trace.evaluated",
    payload: { evaluatorNames: body.evaluatorNames, results: results.map((r) => ({ name: r.evaluatorName, passed: r.passed })) },
  });

  return NextResponse.json({ results });
}
