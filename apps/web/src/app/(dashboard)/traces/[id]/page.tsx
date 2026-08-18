import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { AnnotateForm } from "@/components/trace/annotate-form";
import { TraceTabs } from "@/components/trace/trace-tabs";
import { StatusBadge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { annotations, getDb, spans, traces } from "@/lib/db";

export default async function TraceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const [trace] = await db.select().from(traces).where(eq(traces.id, id)).limit(1);
  if (!trace || trace.projectId !== active.project.id) notFound();

  const spanRows = await db.select().from(spans).where(eq(spans.traceId, id)).orderBy(asc(spans.startTime));
  const annotationRows = await db.select().from(annotations).where(eq(annotations.traceId, id));

  const flatSpans = spanRows.map((s) => ({
    id: s.id,
    parentId: s.parentSpanId,
    name: s.name,
    type: s.type,
    status: s.status,
    startTime: s.startTime,
    endTime: s.endTime,
    latencyMs: s.latencyMs,
    error: s.error,
  }));
  const traceAsSpan = {
    id: trace.id,
    parentId: null,
    name: trace.name,
    status: trace.status,
    startTime: trace.startTime,
    endTime: trace.endTime,
    latencyMs: trace.latencyMs,
    error: trace.error,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{trace.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">{trace.id}</p>
        </div>
        <StatusBadge status={trace.status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Latency" value={trace.latencyMs != null ? `${trace.latencyMs}ms` : "—"} />
        <Stat label="Tokens" value={trace.totalTokens?.toString() ?? "—"} />
        <Stat label="Cost" value={trace.costUsd != null ? `$${trace.costUsd.toFixed(4)}` : "—"} />
        <Stat label="Spans" value={spanRows.length.toString()} />
      </div>

      <TraceTabs trace={traceAsSpan} spans={flatSpans} />

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">Input</h3>
          <pre className="overflow-auto text-xs">{JSON.stringify(trace.input, null, 2)}</pre>
        </div>
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">Output</h3>
          <pre className="overflow-auto text-xs">{JSON.stringify(trace.output, null, 2)}</pre>
        </div>
      </div>

      <AnnotateForm projectId={active.project.id} traceId={trace.id} />

      {annotationRows.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">Review history</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {annotationRows.map((a) => (
              <li key={a.id} className="flex justify-between text-[var(--text-muted)]">
                <span>
                  <span className="text-[var(--text)]">{a.verdict}</span>
                  {a.comment ? ` — ${a.comment}` : ""}
                </span>
                <span>{a.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
