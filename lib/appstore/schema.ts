import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RenderableBrief } from "../brief/render";

// The copilot's own derived state, kept separate from the customer's systems of record. Nothing
// here is authoritative: it records what the copilot did so the app can show per-run cost and prove
// grounding. It never holds a system of record.

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
    // The shipped brief itself, exactly as both renderers consume it.
    //
    // Nothing persisted the brief text before this, so an SE who generated one in Slack had no way to
    // see it in the app, and the account page could only report that a run had happened. One column
    // is the whole fix.
    //
    // Stored whole as jsonb rather than normalised into claim rows, and that is a deliberate limit on
    // scope. This is a rendered artifact, not queryable state: the gate has already decided which
    // claims exist and in what order, and splitting them across tables would create a second place
    // where "what the brief says" is decided, which is the one thing this product cannot afford.
    // The citations table stays as it is, holding what was withheld and why.
    //
    // Nullable because a row is written before this shape existed and because status can be running
    // or failed, neither of which has a brief to store.
    brief: jsonb("brief").$type<RenderableBrief>(),
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
// against directly. Linear issues have no such table on our side, so citability has
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
    source: text("source").notNull(), // linear
    label: text("label").notNull(),
    url: text("url"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.citationId] }),
    index("evidence_lookup_idx").on(t.sessionId, t.accountId),
  ],
);

