import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// The copilot's own derived state, kept separate from the customer's systems of record. Nothing
// here is authoritative: it records what the copilot did so the app can show per-run cost, prove
// grounding, and dedupe Slack deliveries. It never holds a system of record.

export const briefRuns = pgTable(
  "brief_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The eve session id, used to join the per-step model_runs recorded by the cost hook.
    sessionId: text("session_id"),
    accountId: text("account_id").notNull(),
    status: text("status").notNull(), // running | shipped | failed
    grounded: boolean("grounded"),
    groundedClaims: integer("grounded_claims"),
    droppedClaims: integer("dropped_claims"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("brief_runs_account_idx").on(t.accountId), index("brief_runs_session_idx").on(t.sessionId)],
);

// One row per model step, written by the cost hook from the step.completed usage the AI Gateway
// reports. Keyed by session so a run's total cost is the sum of its steps.
export const modelRuns = pgTable(
  "model_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    stepIndex: integer("step_index").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    costUsd: real("cost_usd"),
    generationId: text("generation_id"),
    finishReason: text("finish_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("model_runs_session_idx").on(t.sessionId)],
);

// The citation index: every claim the gate withheld and why. Dropped claims are the proof the gate
// did its job.
export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefRunId: uuid("brief_run_id")
      .notNull()
      .references(() => briefRuns.id),
    claim: text("claim").notNull(),
    activityId: text("activity_id"),
    status: text("status").notNull(), // cited | dropped
  },
  (t) => [index("citations_brief_idx").on(t.briefRunId)],
);

// What the agent actually read from a live system during one run.
//
// Warehouse rows are citable because they exist in fct_account_activity, which the gate can check
// against directly. Notion pages and Linear issues have no such table on our side, so citability has
// to come from somewhere else: a read tool records what it returned, and the gate resolves citations
// against that.
//
// Scoping by session and account is the point, not bookkeeping. It means the model may only cite what
// it actually read, in this run, for this account. An id carried over from another account earlier in
// the same Slack thread does not resolve, and a plausible-looking issue key the model composed from
// memory does not either.
export const evidence = pgTable(
  "evidence",
  {
    sessionId: text("session_id").notNull(),
    citationId: text("citation_id").notNull(),
    accountId: text("account_id").notNull(),
    source: text("source").notNull(), // linear | notion
    label: text("label").notNull(),
    url: text("url"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.citationId] }),
    index("evidence_lookup_idx").on(t.sessionId, t.accountId),
  ],
);

// At-least-once Slack delivery is deduped on this key so a retried post does not double-send.
export const slackDeliveries = pgTable("slack_deliveries", {
  id: text("id").primaryKey(),
  briefRunId: uuid("brief_run_id").references(() => briefRuns.id),
  channel: text("channel").notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
});
