import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { CreateDatasetForm } from "@/components/datasets/create-dataset-form";
import { getActiveProject } from "@/lib/auth";
import { datasetExamples, datasets, getDb } from "@/lib/db";

export default async function DatasetsPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const rows = await db
    .select({
      dataset: datasets,
      exampleCount: sql<number>`count(${datasetExamples.id})`.mapWith(Number),
    })
    .from(datasets)
    .leftJoin(datasetExamples, eq(datasetExamples.datasetId, datasets.id))
    .where(eq(datasets.projectId, active.project.id))
    .groupBy(datasets.id)
    .orderBy(desc(datasets.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Datasets</h1>
      <CreateDatasetForm projectId={active.project.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ dataset, exampleCount }) => (
          <Link key={dataset.id} href={`/datasets/${dataset.id}`} className="card p-4 hover:border-accent/50">
            <h3 className="font-medium">{dataset.name}</h3>
            {dataset.description && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{dataset.description}</p>
            )}
            <p className="mt-2 text-xs text-[var(--text-muted)]">{exampleCount} example(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
