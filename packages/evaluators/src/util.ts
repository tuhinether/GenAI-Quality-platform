/** Renders any evaluator input/output as plain text for regex/keyword-based checks. */
export function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Extracts numbers from text, handling commas, currency symbols, and percent signs. */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/[-+]?[$€£]?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  return matches
    .map((m) => Number(m.replace(/[$€£,%]/g, "")))
    .filter((n) => !Number.isNaN(n));
}
