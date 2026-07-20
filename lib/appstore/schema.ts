import {
  boolean,
  index,
  integer,
  pgTable,
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
    accountId: text("account_id").notNull(),
    status: text("status").notNull(), // running | shipped | failed
    grounded: boolean("grounded"),
    groundedClaims: integer("grounded_claims"),
    droppedClaims: integer("dropped_claims"),
    model: text("model"),
    costUsd: real("cost_usd"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("brief_runs_account_idx").on(t.accountId)],
);

// One row per model call in a run. Failover shows up as multiple attempts with failed_over set.
export const modelRuns = pgTable(
  "model_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefRunId: uuid("brief_run_id")
      .notNull()
      .references(() => briefRuns.id),
    attempt: integer("attempt").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: real("cost_usd"),
    latencyMs: integer("latency_ms"),
    failedOver: boolean("failed_over").notNull().default(false),
  },
  (t) => [index("model_runs_brief_idx").on(t.briefRunId)],
);

// The citation index: every claim the model produced and whether it resolved to a real activity id.
// Dropped claims are the proof the grounding gate did its job.
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

// At-least-once Slack delivery is deduped on this key so a retried post does not double-send.
export const slackDeliveries = pgTable("slack_deliveries", {
  id: text("id").primaryKey(),
  briefRunId: uuid("brief_run_id").references(() => briefRuns.id),
  channel: text("channel").notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
});
