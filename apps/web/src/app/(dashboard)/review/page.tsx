import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { QuickAnnotate } from "@/components/review/quick-annotate";
import { StatusBadge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { annotations, getDb, traces } from "@/lib/db";

export default async function ReviewQueuePage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const annotated = await db.selectDistinct({ traceId: annotations.traceId }).from(annotations);
  const annotatedIds = annotated.map((a) => a.traceId);

  const rows = await db
    .select()
    .from(traces)
    .where(eq(traces.projectId, active.project.id))
    .orderBy(desc(traces.startTime))
    .limit(50);

  const pending = rows.filter((t) => !annotatedIds.includes(t.id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Review queue</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Traces awaiting human sign-off. {pending.length} pending.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nothing waiting on review. 🎉</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="px-4 py-2 font-normal">Trace</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2 font-normal">Output</th>
                <th className="px-4 py-2 font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((trace) => (
                <tr key={trace.id} className="border-b border-[var(--border)]/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/traces/${trace.id}`} className="font-medium hover:text-accent">
                      {trace.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-[var(--text-muted)]">
                    {JSON.stringify(trace.output)}
                  </td>
                  <td className="px-4 py-2.5">
                    <QuickAnnotate projectId={active.project.id} traceId={trace.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
