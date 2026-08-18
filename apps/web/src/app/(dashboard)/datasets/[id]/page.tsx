import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { AddExampleForm } from "@/components/datasets/add-example-form";
import { getActiveProject } from "@/lib/auth";
import { datasetExamples, datasets, getDb } from "@/lib/db";

export default async function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
  if (!dataset || dataset.projectId !== active.project.id) notFound();

  const examples = await db
    .select()
    .from(datasetExamples)
    .where(eq(datasetExamples.datasetId, id))
    .orderBy(asc(datasetExamples.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{dataset.name}</h1>
        {dataset.description && <p className="text-sm text-[var(--text-muted)]">{dataset.description}</p>}
      </div>

      <AddExampleForm datasetId={dataset.id} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-2 font-normal">Input</th>
              <th className="px-4 py-2 font-normal">Expected output</th>
            </tr>
          </thead>
          <tbody>
            {examples.map((ex) => (
              <tr key={ex.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="max-w-md truncate px-4 py-2.5">{JSON.stringify(ex.input)}</td>
                <td className="max-w-md truncate px-4 py-2.5 text-[var(--text-muted)]">
                  {ex.expectedOutput ? JSON.stringify(ex.expectedOutput) : "—"}
                </td>
              </tr>
            ))}
            {examples.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  No examples yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
