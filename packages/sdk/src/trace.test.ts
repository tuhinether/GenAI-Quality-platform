import { describe, expect, it } from "vitest";
import { TickmarkClient } from "./client";
import { annotateSpan, traceable } from "./trace";
import type { IngestEvent } from "./types";

function makeClient() {
  const events: IngestEvent[] = [];
  const client = new TickmarkClient({
    ingestUrl: "http://example.invalid/api/ingest",
    flushIntervalMs: 0,
  });
  const originalEnqueue = client.enqueue.bind(client);
  client.enqueue = (event: IngestEvent) => {
    events.push(event);
    originalEnqueue(event);
  };
  return { client, events };
}

describe("traceable", () => {
  it("records the root call as a trace with no parent", async () => {
    const { client, events } = makeClient();
    const agent = traceable(async (q: string) => `answer: ${q}`, { name: "agent", client });

    await agent("what is Q3 revenue?");

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("trace");
    expect(events[0]?.parentSpanId).toBeNull();
    expect(events[0]?.output).toBe("answer: what is Q3 revenue?");
  });

  it("links nested traceable calls into one trace with correct parentage", async () => {
    const { client, events } = makeClient();

    const tool = traceable(async (x: number) => x * 2, { name: "calculator", type: "tool", client });
    const agent = traceable(
      async (x: number) => {
        const doubled = await tool(x);
        return doubled + 1;
      },
      { name: "agent", type: "agent", client },
    );

    await agent(5);

    expect(events).toHaveLength(2);
    const trace = events.find((e) => e.kind === "trace")!;
    const span = events.find((e) => e.kind === "span")!;

    expect(trace.parentSpanId).toBeNull();
    expect(span.parentSpanId).toBe(trace.id);
    expect(span.traceId).toBe(trace.id);
    expect(span.traceId).toBe(trace.traceId);
    expect(trace.output).toBe(11);
  });

  it("records status: error and re-throws when the wrapped function throws", async () => {
    const { client, events } = makeClient();
    const failing = traceable(
      async () => {
        throw new Error("boom");
      },
      { name: "failing", client },
    );

    await expect(failing()).rejects.toThrow("boom");
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("error");
    expect(events[0]?.error).toBe("boom");
  });

  it("attaches usage via annotateSpan to the currently-executing span", async () => {
    const { client, events } = makeClient();
    const llmCall = traceable(
      async (prompt: string) => {
        annotateSpan({ tokens: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }, costUsd: 0.002 });
        return `response to ${prompt}`;
      },
      { name: "llm-call", type: "llm", client },
    );

    await llmCall("hello");

    expect(events[0]?.tokens?.totalTokens).toBe(15);
    expect(events[0]?.costUsd).toBe(0.002);
  });
});
