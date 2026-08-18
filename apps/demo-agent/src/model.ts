import Anthropic from "@anthropic-ai/sdk";
import { annotateSpan, traceable } from "@tickmark/sdk";

let client: Anthropic | undefined;

function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  // Rough Claude Haiku-class pricing for demo purposes only.
  return (promptTokens / 1_000_000) * 0.8 + (completionTokens / 1_000_000) * 4;
}

/**
 * Generates the agent's answer. Uses a real Claude call when ANTHROPIC_API_KEY
 * is set; otherwise returns a deterministic scripted answer so the demo is
 * reproducible offline with no API key and no network dependency.
 */
export const callModel = traceable(
  async (question: string, context: string, scriptedAnswer: string) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 200));
      const promptTokens = Math.round((question.length + context.length) / 4);
      const completionTokens = Math.round(scriptedAnswer.length / 4);
      annotateSpan({
        tokens: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        costUsd: estimateCostUsd(promptTokens, completionTokens),
        metadata: { model: "scripted-offline" },
      });
      return scriptedAnswer;
    }

    if (!client) client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      system:
        "You are a finance research assistant. Answer strictly using the provided source document. " +
        'Cite it with "[S1]" whenever you state a figure from it.',
      messages: [{ role: "user", content: `SOURCE DOCUMENT [S1]:\n${context}\n\nQUESTION: ${question}` }],
    });

    const block = message.content[0];
    const text = block?.type === "text" ? block.text : "";
    annotateSpan({
      tokens: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
      costUsd: estimateCostUsd(message.usage.input_tokens, message.usage.output_tokens),
      metadata: { model: "claude-3-5-haiku-latest" },
    });
    return text;
  },
  { name: "claude-3-5-haiku", type: "llm" },
);
