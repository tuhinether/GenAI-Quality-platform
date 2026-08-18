import { eq, sql } from "drizzle-orm";
import type { IngestEvent } from "@tickmark/sdk";
import { appendAuditLog, getDb, spans, traces } from "./db";

/**
 * A span's `finally` block always completes before its parent trace's
 * (post-order), so a span can reach the ingestion API before the trace it
 * belongs to — and the SDK's periodic auto-flush can split them across
 * separate HTTP requests entirely. Rather than requiring strict ordering,
 * spans upsert a lightweight placeholder trace row first (status "running"),
 * and the real trace event later fills it in via onConflictDoUpdate — the
 * standard "stub now, backfill later" pattern tracing backends use.
 */
async function ensureTracePlaceholder(
  db: ReturnType<typeof getDb>,
  projectId: string,
  traceId: string,
  startTime: string,
): Promise<void> {
  await db
    .insert(traces)
    .values({
      id: traceId,
      projectId,
      name: "(pending)",
      status: "running",
      startTime: new Date(startTime),
    })
    .onConflictDoNothing();
}

export async function persistIngestEvent(projectId: string, event: IngestEvent): Promise<void> {
  const db = getDb();

  if (event.kind === "trace") {
    await db
      .insert(traces)
      .values({
        id: event.id,
        projectId,
        name: event.name,
        status: event.status,
        input: event.input,
        output: event.output,
        metadata: event.metadata,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        latencyMs: event.latencyMs,
        promptTokens: event.tokens?.promptTokens ?? 0,
        completionTokens: event.tokens?.completionTokens ?? 0,
        totalTokens: event.tokens?.totalTokens ?? 0,
        costUsd: event.costUsd ?? 0,
        error: event.error,
      })
      .onConflictDoUpdate({
        target: traces.id,
        set: {
          name: event.name,
          status: event.status,
          input: event.input,
          output: event.output,
          metadata: event.metadata,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          latencyMs: event.latencyMs,
          error: event.error,
          // A placeholder may already carry rolled-up usage from spans that
          // arrived first — add to it rather than overwrite.
          promptTokens: sql`coalesce(${traces.promptTokens}, 0) + ${event.tokens?.promptTokens ?? 0}`,
          completionTokens: sql`coalesce(${traces.completionTokens}, 0) + ${event.tokens?.completionTokens ?? 0}`,
          totalTokens: sql`coalesce(${traces.totalTokens}, 0) + ${event.tokens?.totalTokens ?? 0}`,
          costUsd: sql`coalesce(${traces.costUsd}, 0) + ${event.costUsd ?? 0}`,
        },
      });

    await appendAuditLog(db, {
      projectId,
      traceId: event.id,
      eventType: "trace.ingested",
      payload: { name: event.name, status: event.status, latencyMs: event.latencyMs },
    });
    return;
  }

  await ensureTracePlaceholder(db, projectId, event.traceId, event.startTime);

  await db.insert(spans).values({
    id: event.id,
    traceId: event.traceId,
    parentSpanId: event.parentSpanId,
    name: event.name,
    type: event.type ?? "chain",
    input: event.input,
    output: event.output,
    metadata: event.metadata,
    startTime: new Date(event.startTime),
    endTime: new Date(event.endTime),
    latencyMs: event.latencyMs,
    tokens: event.tokens?.totalTokens,
    costUsd: event.costUsd,
    status: event.status,
    error: event.error,
  });

  // Roll up leaf-span usage onto the parent trace so trace-level cost/token
  // totals (used by the traces list and the monitoring cost chart) reflect
  // every LLM call in the trace, not just the root span's own usage.
  if (event.tokens?.totalTokens || event.costUsd) {
    await db
      .update(traces)
      .set({
        totalTokens: sql`coalesce(${traces.totalTokens}, 0) + ${event.tokens?.totalTokens ?? 0}`,
        promptTokens: sql`coalesce(${traces.promptTokens}, 0) + ${event.tokens?.promptTokens ?? 0}`,
        completionTokens: sql`coalesce(${traces.completionTokens}, 0) + ${event.tokens?.completionTokens ?? 0}`,
        costUsd: sql`coalesce(${traces.costUsd}, 0) + ${event.costUsd ?? 0}`,
      })
      .where(eq(traces.id, event.traceId));
  }
}
