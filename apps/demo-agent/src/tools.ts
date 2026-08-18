import { traceable, annotateSpan } from "@tickmark/sdk";
import { SOURCE_DOCUMENT, TICKER } from "./data";

/** Mocks a retrieval tool that would normally hit EDGAR / an internal filings index. */
export const secFilingLookup = traceable(
  async (ticker: string) => {
    await sleep(80 + Math.random() * 60);
    if (ticker !== TICKER) return { found: false as const };
    return { found: true as const, source: SOURCE_DOCUMENT };
  },
  { name: "sec-filing-lookup", type: "tool" },
);

/** Mocks a calculator tool for follow-up arithmetic (growth rates, ratios). */
export const calculator = traceable(
  async (expression: string) => {
    await sleep(20 + Math.random() * 20);
    const result = Function(`"use strict"; return (${expression});`)() as number;
    return { expression, result };
  },
  { name: "calculator", type: "tool" },
);

/** Mocks a web search tool the agent can fall back to when a filing doesn't cover the question. */
export const webSearch = traceable(
  async (query: string) => {
    await sleep(100 + Math.random() * 80);
    annotateSpan({ metadata: { provider: "mock-search" } });
    return { query, results: [] as string[] };
  },
  { name: "web-search", type: "tool" },
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
