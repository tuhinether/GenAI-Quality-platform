import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { PassFailBadge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { datasetExamples, evaluatorResults, experimentRuns, experiments, getDb } from "@/lib/db";

export default async function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id)).limit(1);
  if (!experiment || experiment.projectId !== active.project.id) notFound();

  const runs = await db
    .select({ run: experimentRuns, example: datasetExamples })
    .from(experimentRuns)
    .innerJoin(datasetExamples, eq(datasetExamples.id, experimentRuns.exampleId))
    .where(eq(experimentRuns.experimentId, id))
    .orderBy(asc(experimentRuns.createdAt));

  const runIds = runs.map((r) => r.run.id);
  const results = runIds.length
    ? await db.select().from(evaluatorResults).where(inArray(evaluatorResults.experimentRunId, runIds))
    : [];

  const resultsByRun = new Map<string, typeof results>();
  for (const result of results) {
    if (!result.experimentRunId) continue;
    const bucket = resultsByRun.get(result.experimentRunId);
    if (bucket) bucket.push(result);
    else resultsByRun.set(result.experimentRunId, [result]);
  }

  const evaluatorNames = experiment.evaluatorNames as string[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{experiment.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">{evaluatorNames.join(", ")}</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-2 font-normal">Input</th>
              <th className="px-4 py-2 font-normal">Actual output</th>
              {evaluatorNames.map((name) => (
                <th key={name} className="px-4 py-2 font-normal">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map(({ run, example }) => {
              const runResults = resultsByRun.get(run.id) ?? [];
              return (
                <tr key={run.id} className="border-b border-[var(--border)]/60 last:border-0 align-top">
                  <td className="max-w-xs truncate px-4 py-2.5">{JSON.stringify(example.input)}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-[var(--text-muted)]">
                    {JSON.stringify(run.actualOutput)}
                  </td>
                  {evaluatorNames.map((name) => {
                    const result = runResults.find((r) => r.evaluatorName === name);
                    return (
                      <td key={name} className="px-4 py-2.5">
                        {result ? (
                          <div className="flex flex-col gap-1">
                            <PassFailBadge passed={result.passed} score={result.score} />
                            {result.reasoning && (
                              <span className="max-w-[200px] text-xs text-[var(--text-muted)]">
                                {result.reasoning}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
