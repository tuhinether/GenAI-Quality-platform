import { NextRequest, NextResponse } from "next/server";
import type { IngestEvent } from "@tickmark/sdk";
import { authenticateRequest } from "@/lib/authenticate-request";
import { persistIngestEvent } from "@/lib/ingest";

export async function POST(req: NextRequest) {
  const key = await authenticateRequest(req);
  if (!key) return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { events?: IngestEvent[] } | null;
  const events = body?.events;
  if (!events || !Array.isArray(events)) {
    return NextResponse.json({ error: "Request body must be { events: IngestEvent[] }" }, { status: 400 });
  }

  // A span's `finally` block always fires before its parent trace's (post-order
  // completion), so spans land in the buffer ahead of the trace they belong to.
  // Insert trace rows first so the spans' FK reference always resolves.
  const ordered = [...events].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "trace" ? -1 : 1));
  for (const event of ordered) {
    await persistIngestEvent(key.projectId, event);
  }

  return NextResponse.json({ accepted: events.length });
}
