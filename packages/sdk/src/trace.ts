import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { getDefaultClient, TickmarkClient } from "./client";
import type { EventStatus, IngestEvent, SpanType, TokenUsage } from "./types";

interface SpanExtra {
  tokens?: TokenUsage;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}

interface ActiveContext {
  traceId: string;
  /** id of the trace/span currently executing; children use this as their parentSpanId. */
  currentSpanId: string;
  client: TickmarkClient;
  extra: SpanExtra;
}

const als = new AsyncLocalStorage<ActiveContext>();

export interface TraceableOptions {
  name: string;
  /** Span type for nested calls; ignored for the root call, which always becomes a trace. */
  type?: SpanType;
  client?: TickmarkClient;
  metadata?: Record<string, unknown>;
}

/**
 * Attach token usage, cost, or extra metadata to the currently-executing
 * trace/span from inside a traceable()-wrapped function, e.g. right after an
 * LLM call returns its usage stats.
 */
export function annotateSpan(patch: SpanExtra): void {
  const ctx = als.getStore();
  if (!ctx) return;
  if (patch.tokens) ctx.extra.tokens = { ...ctx.extra.tokens, ...patch.tokens };
  if (patch.costUsd !== undefined) ctx.extra.costUsd = patch.costUsd;
  if (patch.metadata) ctx.extra.metadata = { ...ctx.extra.metadata, ...patch.metadata };
}

export function getCurrentTraceId(): string | undefined {
  return als.getStore()?.traceId;
}

/**
 * Wraps an async function so each call is recorded as a trace (if there is no
 * active trace in the current async context) or a child span (if there is).
 * Nesting traceable() calls inside one another builds the multi-agent/tool
 * call graph automatically via AsyncLocalStorage — no manual span plumbing.
 */
export function traceable<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  options: TraceableOptions,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    const parent = als.getStore();
    const client = options.client ?? parent?.client ?? getDefaultClient();
    const id = randomUUID();
    const traceId = parent?.traceId ?? id;
    const parentSpanId = parent ? parent.currentSpanId : null;

    const nextCtx: ActiveContext = { traceId, currentSpanId: id, client, extra: {} };

    const startTime = new Date();
    let status: EventStatus = "success";
    let output: unknown;
    let errorMessage: string | undefined;

    try {
      output = await als.run(nextCtx, () => fn(...args));
      return output as R;
    } catch (err) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const endTime = new Date();
      const event: IngestEvent = {
        kind: parent ? "span" : "trace",
        id,
        traceId,
        parentSpanId,
        name: options.name,
        type: parent ? (options.type ?? "chain") : undefined,
        status,
        input: args.length === 1 ? args[0] : args,
        output,
        error: errorMessage,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        latencyMs: endTime.getTime() - startTime.getTime(),
        tokens: nextCtx.extra.tokens,
        costUsd: nextCtx.extra.costUsd,
        metadata: { ...options.metadata, ...nextCtx.extra.metadata },
      };
      client.enqueue(event);
    }
  };
}
