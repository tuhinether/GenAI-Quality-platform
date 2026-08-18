import Anthropic from "@anthropic-ai/sdk";
import type { LlmJudge } from "@tickmark/evaluators";

let client: Anthropic | undefined;

/** Wires the llm-judge evaluator to a real Claude call. Returns undefined when no API key is set. */
export function getLlmJudge(): LlmJudge | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return undefined;

  if (!client) client = new Anthropic({ apiKey });

  return async (prompt: string) => {
    const message = await client!.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    return block?.type === "text" ? block.text : "";
  };
}
