import Ajv from "ajv";
import type { Evaluator } from "../types";

const ajv = new Ajv({ allErrors: true, strict: false });

export const jsonSchemaValidityEvaluator: Evaluator = {
  name: "json-schema-validity",
  description: "Validates actualOutput against a JSON schema in metadata.schema.",
  evaluate({ actualOutput, metadata }) {
    const schema = metadata?.schema;
    if (!schema || typeof schema !== "object") {
      return {
        evaluatorName: "json-schema-validity",
        score: null,
        passed: false,
        reasoning: "No JSON schema provided in metadata.schema.",
      };
    }

    const validate = ajv.compile(schema);
    const passed = validate(actualOutput);

    return {
      evaluatorName: "json-schema-validity",
      score: passed ? 1 : 0,
      passed,
      reasoning: passed
        ? "Output conforms to the provided JSON schema."
        : `Output violates schema: ${ajv.errorsText(validate.errors)}`,
      metadata: { errors: validate.errors },
    };
  },
};
