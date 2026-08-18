import { loadEnv } from "./env";

loadEnv();

import { eq } from "drizzle-orm";
import { datasetExamples, datasets, getDb } from "@tickmark/db";
import { getDefaultClient } from "@tickmark/sdk";
import { financeResearchAgent } from "./agent";
import { FINANCE_QUESTIONS, SOURCE_DOCUMENT, type FinanceQuestion } from "./data";

const EVALUATOR_NAMES = [
  "numeric-grounding",
  "citation-grounding",
  "pii-mnpi-leakage",
  "disclaimer-presence",
  "numeric-tolerance",
];

interface RunResult {
  question: FinanceQuestion;
  answer: string;
  traceId?: string;
}

function apiBase(): string {
  const ingestUrl = process.env.TICKMARK_INGEST_URL;
  if (!ingestUrl) throw new Error("TICKMARK_INGEST_URL is not set. Run `pnpm db:seed` first.");
  return new URL(ingestUrl).origin;
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const apiKey = process.env.TICKMARK_API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey ?? ""}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const db = getDb();
  const [dataset] = await db.select().from(datasets).limit(1);
  if (!dataset) throw new Error("No dataset found. Run `pnpm db:seed` first.");

  const examples = await db.select().from(datasetExamples).where(eq(datasetExamples.datasetId, dataset.id));
  const exampleByQuestionId = new Map(
    examples.map((e) => [(e.metadata as { questionId?: string } | null)?.questionId, e]),
  );

  console.log(`Running finance research agent against ${FINANCE_QUESTIONS.length} questions...`);
  const runs: RunResult[] = [];
  for (const question of FINANCE_QUESTIONS) {
    const { answer, traceId } = await financeResearchAgent(question.question, question.scriptedAnswer);
    console.log(`  [${question.id}] ${answer.slice(0, 90)}${answer.length > 90 ? "…" : ""}`);
    runs.push({ question, answer, traceId });
  }

  console.log("Flushing traces to the ingestion API...");
  await getDefaultClient().flush();
  getDefaultClient().close();

  const base = apiBase();
  const sharedMetadata = { sourceDocument: SOURCE_DOCUMENT.text, sources: [SOURCE_DOCUMENT] };

  console.log("Evaluating live traces for the monitoring dashboard...");
  for (const { question, answer, traceId } of runs) {
    if (!traceId) continue;
    await postJson(`${base}/api/evaluate`, {
      traceId,
      evaluatorNames: EVALUATOR_NAMES,
      input: question.question,
      actualOutput: answer,
      expectedOutput: question.expectedOutput,
      metadata: sharedMetadata,
    });
  }

  console.log("Recording an experiment against the seeded dataset...");
  const experimentRuns = runs
    .map(({ question, answer, traceId }) => {
      const example = exampleByQuestionId.get(question.id);
      if (!example) return null;
      return {
        exampleId: example.id,
        input: question.question,
        actualOutput: answer,
        expectedOutput: question.expectedOutput,
        traceId,
        metadata: sharedMetadata,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await postJson(`${base}/api/experiments/run`, {
    datasetId: dataset.id,
    name: `Run ${new Date().toISOString()}`,
    evaluatorNames: EVALUATOR_NAMES,
    runs: experimentRuns,
  });

  console.log(
    "\nDone. Open the dashboard to see traces, the call graph, experiment results, and monitoring charts.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
