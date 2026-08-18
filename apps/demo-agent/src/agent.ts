import { getCurrentTraceId, traceable } from "@tickmark/sdk";
import { TICKER } from "./data";
import { callModel } from "./model";
import { secFilingLookup } from "./tools";

export const financeResearchAgent = traceable(
  async (question: string, scriptedAnswer: string) => {
    const traceId = getCurrentTraceId();
    const lookup = await secFilingLookup(TICKER);
    const context = lookup.found ? lookup.source.text : "";
    const answer = await callModel(question, context, scriptedAnswer);
    return { answer, traceId };
  },
  { name: "finance-research-agent", type: "agent" },
);
