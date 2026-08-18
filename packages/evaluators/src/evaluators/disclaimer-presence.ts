import type { Evaluator } from "../types";
import { toText } from "../util";

const ADVICE_TRIGGERS: RegExp[] = [
  /\byou should (buy|sell|invest)\b/i,
  /\bwe recommend (buying|selling|investing)\b/i,
  /\bis a (strong )?(buy|sell)\b/i,
  /\bnow is the time to (buy|sell|invest)\b/i,
];

const DEFAULT_DISCLAIMERS = [
  "not financial advice",
  "not investment advice",
  "consult a licensed financial advisor",
  "consult a financial advisor",
  "for informational purposes only",
];

/**
 * Finance-specific evaluator: whenever the output uses investment-advice-like
 * language ("you should buy...", "is a strong sell"), a compliance disclaimer
 * must also be present. Passes trivially when no advice-like language is used.
 */
export const disclaimerPresenceEvaluator: Evaluator = {
  name: "disclaimer-presence",
  description: "Requires a compliance disclaimer whenever investment-advice language is used.",
  evaluate({ actualOutput, metadata }) {
    const text = toText(actualOutput);
    const lower = text.toLowerCase();

    const usesAdviceLanguage = ADVICE_TRIGGERS.some((re) => re.test(text));
    if (!usesAdviceLanguage) {
      return {
        evaluatorName: "disclaimer-presence",
        score: 1,
        passed: true,
        reasoning: "No investment-advice language detected; disclaimer not required.",
      };
    }

    const requiredPhrases = (metadata?.requiredPhrases as string[] | undefined) ?? DEFAULT_DISCLAIMERS;
    const hasDisclaimer = requiredPhrases.some((phrase) => lower.includes(phrase.toLowerCase()));

    return {
      evaluatorName: "disclaimer-presence",
      score: hasDisclaimer ? 1 : 0,
      passed: hasDisclaimer,
      reasoning: hasDisclaimer
        ? "Investment-advice language is accompanied by a compliance disclaimer."
        : "Output uses investment-advice language without a required compliance disclaimer.",
    };
  },
};
