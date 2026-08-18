import type { Evaluator } from "../types";
import { toText } from "../util";

interface Source {
  id: string;
  text: string;
}

const CITATION_PATTERN = /\[([A-Za-z0-9_-]+)\]/g;

/**
 * Finance-specific evaluator: when `metadata.sources` (the documents the agent
 * was given, e.g. filing excerpts) are provided, the output must cite them
 * using `[sourceId]` markers, and every marker used must refer to a real
 * source. Catches both fabricated citations and uncited claims.
 */
export const citationGroundingEvaluator: Evaluator = {
  name: "citation-grounding",
  description: "Verifies citation markers in actualOutput reference real entries in metadata.sources.",
  evaluate({ actualOutput, metadata }) {
    const sources = metadata?.sources as Source[] | undefined;
    if (!sources || sources.length === 0) {
      return {
        evaluatorName: "citation-grounding",
        score: null,
        passed: false,
        reasoning: "No sources provided in metadata.sources; cannot verify citations.",
      };
    }

    const text = toText(actualOutput);
    const markers = [...text.matchAll(CITATION_PATTERN)].map((m) => m[1] ?? "");
    const uniqueMarkers = [...new Set(markers)];
    const sourceIds = new Set(sources.map((s) => s.id));

    const fabricated = uniqueMarkers.filter((id) => !sourceIds.has(id));
    const hasCitations = uniqueMarkers.length > 0;

    const passed = hasCitations && fabricated.length === 0;

    let reasoning: string;
    if (!hasCitations) {
      reasoning = `${sources.length} source(s) were provided but the output contains no [sourceId] citations.`;
    } else if (fabricated.length > 0) {
      reasoning = `Output cites unknown source id(s): [${fabricated.join(", ")}] not present in metadata.sources.`;
    } else {
      reasoning = `All ${uniqueMarkers.length} citation(s) resolve to a provided source.`;
    }

    return {
      evaluatorName: "citation-grounding",
      score: passed ? 1 : 0,
      passed,
      reasoning,
      metadata: { citedMarkers: uniqueMarkers, fabricated },
    };
  },
};
