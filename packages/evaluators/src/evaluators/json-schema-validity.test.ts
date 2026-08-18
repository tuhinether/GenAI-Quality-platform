import { describe, expect, it } from "vitest";
import { jsonSchemaValidityEvaluator } from "./json-schema-validity";

const schema = {
  type: "object",
  required: ["ticker", "recommendation"],
  properties: {
    ticker: { type: "string" },
    recommendation: { type: "string", enum: ["buy", "hold", "sell"] },
  },
};

describe("jsonSchemaValidityEvaluator", () => {
  it("passes on a conforming object", async () => {
    const result = await jsonSchemaValidityEvaluator.evaluate({
      input: "q",
      actualOutput: { ticker: "ACME", recommendation: "hold" },
      metadata: { schema },
    });
    expect(result.passed).toBe(true);
  });

  it("fails when a required field is missing", async () => {
    const result = await jsonSchemaValidityEvaluator.evaluate({
      input: "q",
      actualOutput: { ticker: "ACME" },
      metadata: { schema },
    });
    expect(result.passed).toBe(false);
  });

  it("fails when an enum value is invalid", async () => {
    const result = await jsonSchemaValidityEvaluator.evaluate({
      input: "q",
      actualOutput: { ticker: "ACME", recommendation: "yolo" },
      metadata: { schema },
    });
    expect(result.passed).toBe(false);
  });
});
