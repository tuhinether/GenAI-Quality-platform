import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  real,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tenancy: orgs -> projects -> api keys. Users come from Supabase auth.users;
// we only keep org membership here (Supabase manages identity/credentials).
// ---------------------------------------------------------------------------

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(), // references auth.users(id) in Supabase
    role: text("role", { enum: ["owner", "admin", "member", "reviewer"] })
      .notNull()
      .default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("org_members_org_user_idx").on(t.orgId, t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("projects_org_slug_idx").on(t.orgId, t.slug)],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // first chars shown in UI, e.g. tk_live_ab12
    hashedKey: text("hashed_key").notNull(), // sha256 of the full key, never store plaintext
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("api_keys_project_idx").on(t.projectId)],
);

// ---------------------------------------------------------------------------
// Tracing: traces (top-level runs) and spans (nested LLM/tool/agent calls).
// ---------------------------------------------------------------------------

export const traceStatusEnum = ["running", "success", "error"] as const;
export const spanTypeEnum = ["llm", "tool", "agent", "chain", "retriever"] as const;

export const traces = pgTable(
  "traces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status", { enum: traceStatusEnum }).notNull().default("running"),
    input: jsonb("input"),
    output: jsonb("output"),
    metadata: jsonb("metadata"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
    endTime: timestamp("end_time", { withTimezone: true }),
    latencyMs: integer("latency_ms"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    costUsd: real("cost_usd"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("traces_project_idx").on(t.projectId),
    index("traces_project_start_idx").on(t.projectId, t.startTime),
  ],
);

export const spans = pgTable(
  "spans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    parentSpanId: uuid("parent_span_id"),
    name: text("name").notNull(),
    type: text("type", { enum: spanTypeEnum }).notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    metadata: jsonb("metadata"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
    endTime: timestamp("end_time", { withTimezone: true }),
    latencyMs: integer("latency_ms"),
    tokens: integer("tokens"),
    costUsd: real("cost_usd"),
    status: text("status", { enum: traceStatusEnum }).notNull().default("running"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("spans_trace_idx").on(t.traceId),
    index("spans_parent_idx").on(t.parentSpanId),
  ],
);

// ---------------------------------------------------------------------------
// Datasets & experiments: golden examples, and evaluator runs against them.
// ---------------------------------------------------------------------------

export const datasets = pgTable(
  "datasets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("datasets_project_idx").on(t.projectId)],
);

export const datasetExamples = pgTable(
  "dataset_examples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    input: jsonb("input").notNull(),
    expectedOutput: jsonb("expected_output"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("dataset_examples_dataset_idx").on(t.datasetId)],
);

export const experiments = pgTable(
  "experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    evaluatorNames: jsonb("evaluator_names").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("experiments_project_idx").on(t.projectId)],
);

export const experimentRuns = pgTable(
  "experiment_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    exampleId: uuid("example_id")
      .notNull()
      .references(() => datasetExamples.id, { onDelete: "cascade" }),
    traceId: uuid("trace_id").references(() => traces.id, { onDelete: "set null" }),
    actualOutput: jsonb("actual_output"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("experiment_runs_experiment_idx").on(t.experimentId)],
);

export const evaluatorResults = pgTable(
  "evaluator_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentRunId: uuid("experiment_run_id").references(() => experimentRuns.id, {
      onDelete: "cascade",
    }),
    traceId: uuid("trace_id").references(() => traces.id, { onDelete: "cascade" }),
    evaluatorName: text("evaluator_name").notNull(),
    score: real("score"),
    passed: boolean("passed").notNull(),
    reasoning: text("reasoning"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("evaluator_results_run_idx").on(t.experimentRunId),
    index("evaluator_results_trace_idx").on(t.traceId),
  ],
);

// ---------------------------------------------------------------------------
// Human review + governance.
// ---------------------------------------------------------------------------

export const annotations = pgTable(
  "annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").notNull(), // references auth.users(id)
    verdict: text("verdict", { enum: ["approve", "reject", "needs_review"] }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("annotations_trace_idx").on(t.traceId)],
);

// Tamper-evident audit log: each row hashes its own payload + the previous
// row's hash, so any edit or deletion breaks the chain and can be detected
// on export (see packages/db/src/audit.ts).
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    traceId: uuid("trace_id").references(() => traces.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_project_idx").on(t.projectId),
    index("audit_log_project_created_idx").on(t.projectId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const orgsRelations = relations(orgs, ({ many }) => ({
  members: many(orgMembers),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  org: one(orgs, { fields: [projects.orgId], references: [orgs.id] }),
  apiKeys: many(apiKeys),
  traces: many(traces),
  datasets: many(datasets),
  experiments: many(experiments),
}));

export const tracesRelations = relations(traces, ({ one, many }) => ({
  project: one(projects, { fields: [traces.projectId], references: [projects.id] }),
  spans: many(spans),
  annotations: many(annotations),
  evaluatorResults: many(evaluatorResults),
}));

export const spansRelations = relations(spans, ({ one }) => ({
  trace: one(traces, { fields: [spans.traceId], references: [traces.id] }),
}));

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  project: one(projects, { fields: [datasets.projectId], references: [projects.id] }),
  examples: many(datasetExamples),
  experiments: many(experiments),
}));

export const datasetExamplesRelations = relations(datasetExamples, ({ one, many }) => ({
  dataset: one(datasets, { fields: [datasetExamples.datasetId], references: [datasets.id] }),
  runs: many(experimentRuns),
}));

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  project: one(projects, { fields: [experiments.projectId], references: [projects.id] }),
  dataset: one(datasets, { fields: [experiments.datasetId], references: [datasets.id] }),
  runs: many(experimentRuns),
}));

export const experimentRunsRelations = relations(experimentRuns, ({ one, many }) => ({
  experiment: one(experiments, {
    fields: [experimentRuns.experimentId],
    references: [experiments.id],
  }),
  example: one(datasetExamples, {
    fields: [experimentRuns.exampleId],
    references: [datasetExamples.id],
  }),
  trace: one(traces, { fields: [experimentRuns.traceId], references: [traces.id] }),
  evaluatorResults: many(evaluatorResults),
}));

export const evaluatorResultsRelations = relations(evaluatorResults, ({ one }) => ({
  experimentRun: one(experimentRuns, {
    fields: [evaluatorResults.experimentRunId],
    references: [experimentRuns.id],
  }),
  trace: one(traces, { fields: [evaluatorResults.traceId], references: [traces.id] }),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  trace: one(traces, { fields: [annotations.traceId], references: [traces.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  project: one(projects, { fields: [auditLog.projectId], references: [projects.id] }),
  trace: one(traces, { fields: [auditLog.traceId], references: [traces.id] }),
}));
