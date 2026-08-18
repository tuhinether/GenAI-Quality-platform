import type { IngestEvent } from "./types";

export interface TickmarkClientOptions {
  apiKey?: string;
  ingestUrl?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
  /** Called with events that failed to send after all retries, instead of throwing. */
  onError?: (err: unknown, events: IngestEvent[]) => void;
}

/** Buffers ingest events and flushes them as a batch POST, on a timer or on demand. */
export class TickmarkClient {
  private queue: IngestEvent[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly apiKey: string | undefined;
  private readonly ingestUrl: string | undefined;
  private readonly maxBatchSize: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onError: TickmarkClientOptions["onError"];

  constructor(options: TickmarkClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.TICKMARK_API_KEY;
    this.ingestUrl = options.ingestUrl ?? process.env.TICKMARK_INGEST_URL;
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onError = options.onError;

    const flushIntervalMs = options.flushIntervalMs ?? 2000;
    if (flushIntervalMs > 0) {
      this.timer = setInterval(() => void this.flush(), flushIntervalMs);
      this.timer.unref?.();
    }
  }

  enqueue(event: IngestEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);

    if (!this.ingestUrl) {
      this.onError?.(new Error("TICKMARK_INGEST_URL is not configured"), batch);
      return;
    }

    try {
      const res = await this.fetchImpl(this.ingestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ events: batch }),
      });
      if (!res.ok) {
        throw new Error(`Ingestion request failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      if (this.onError) this.onError(err, batch);
      else throw err;
    }
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

let defaultClient: TickmarkClient | undefined;

export function getDefaultClient(): TickmarkClient {
  if (!defaultClient) defaultClient = new TickmarkClient();
  return defaultClient;
}
