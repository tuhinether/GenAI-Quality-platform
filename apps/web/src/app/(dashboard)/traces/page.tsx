import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { StatusBadge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { getDb, traces } from "@/lib/db";

export default async function TracesPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(traces)
    .where(eq(traces.projectId, active.project.id))
    .orderBy(desc(traces.startTime))
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Traces</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No traces yet. Run <code>pnpm demo</code> to send some.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="px-4 py-2 font-normal">Name</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2 font-normal">Latency</th>
                <th className="px-4 py-2 font-normal">Tokens</th>
                <th className="px-4 py-2 font-normal">Cost</th>
                <th className="px-4 py-2 font-normal">Started</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((trace) => (
                <tr key={trace.id} className="border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--bg-elevated)]">
                  <td className="px-4 py-2.5">
                    <Link href={`/traces/${trace.id}`} className="font-medium hover:text-accent">
                      {trace.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">
                    {trace.latencyMs != null ? `${trace.latencyMs}ms` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{trace.totalTokens ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">
                    {trace.costUsd != null ? `$${trace.costUsd.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">
                    {trace.startTime.toLocaleString()}
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
