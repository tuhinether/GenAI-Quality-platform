import { asc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { auditLog, getDb, verifyAuditChain } from "@/lib/db";

export default async function AuditLogPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.projectId, active.project.id))
    .orderBy(asc(auditLog.createdAt));
  const verification = await verifyAuditChain(db, active.project.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Audit log</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Hash-chained record of every ingested trace, evaluation, and human review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {verification.valid ? (
            <Badge variant="success">chain verified · {verification.entriesChecked} entries</Badge>
          ) : (
            <Badge variant="danger">chain broken at {verification.brokenAtEntryId}</Badge>
          )}
          <a
            href={`/api/audit-log/export?projectId=${active.project.id}&format=csv`}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-elevated)]"
          >
            Export CSV
          </a>
          <a
            href={`/api/audit-log/export?projectId=${active.project.id}&format=json`}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-elevated)]"
          >
            Export JSON
          </a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-2 font-normal">Event</th>
              <th className="px-4 py-2 font-normal">Trace</th>
              <th className="px-4 py-2 font-normal">Hash</th>
              <th className="px-4 py-2 font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-2.5 font-medium">{entry.eventType}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                  {entry.traceId ? entry.traceId.slice(0, 8) : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                  {entry.hash.slice(0, 12)}…
                </td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{entry.createdAt.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
