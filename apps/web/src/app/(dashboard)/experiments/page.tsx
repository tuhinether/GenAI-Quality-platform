import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getActiveProject } from "@/lib/auth";
import { evaluatorResults, experimentRuns, experiments, getDb } from "@/lib/db";

export default async function ExperimentsPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(experiments)
    .where(eq(experiments.projectId, active.project.id))
    .orderBy(desc(experiments.createdAt));

  const summaries = await Promise.all(
    rows.map(async (experiment) => {
      const [agg] = await db
        .select({
          total: sql<number>`count(${evaluatorResults.id})`.mapWith(Number),
          passed: sql<number>`count(${evaluatorResults.id}) filter (where ${evaluatorResults.passed})`.mapWith(
            Number,
          ),
        })
        .from(evaluatorResults)
        .innerJoin(experimentRuns, eq(experimentRuns.id, evaluatorResults.experimentRunId))
        .where(eq(experimentRuns.experimentId, experiment.id));
      return { experiment, total: agg?.total ?? 0, passed: agg?.passed ?? 0 };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Experiments</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Experiments are triggered by instrumented apps (e.g. the demo agent) via{" "}
        <code>POST /api/experiments/run</code> — see the Quickstart in the README.
      </p>
      {summaries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No experiments yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {summaries.map(({ experiment, total, passed }) => {
            const rate = total > 0 ? Math.round((passed / total) * 100) : null;
            return (
              <Link key={experiment.id} href={`/experiments/${experiment.id}`} className="card p-4 hover:border-accent/50">
                <h3 className="font-medium">{experiment.name}</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {(experiment.evaluatorNames as string[]).join(", ")}
                </p>
                <p className="mt-2 text-sm">
                  {rate != null ? (
                    <span className={rate >= 80 ? "text-[var(--success)]" : "text-[var(--warning)]"}>
                      {rate}% pass rate
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">no results</span>
                  )}{" "}
                  <span className="text-[var(--text-muted)]">
                    ({passed}/{total} checks)
                  </span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
