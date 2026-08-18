export type SpanType = "llm" | "tool" | "agent" | "chain" | "retriever";
export type EventStatus = "success" | "error";

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Wire format posted to the ingestion API. One event per completed trace or span. */
export interface IngestEvent {
  kind: "trace" | "span";
  id: string;
  traceId: string;
  parentSpanId: string | null;
  name: string;
  type?: SpanType;
  status: EventStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  startTime: string;
  endTime: string;
  latencyMs: number;
  tokens?: TokenUsage;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}
