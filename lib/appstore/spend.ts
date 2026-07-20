import { sql } from "drizzle-orm";
import { appStore } from "./client";

// Per-run spend, joining each brief run to the model steps recorded for its session. Cost is the AI
// Gateway's own reported figure, summed across the run's steps. This is cost attribution, not an
// invoice, but it is the real per-request cost the gateway charged.

export type RunCost = {
  sessionId: string | null;
  accountId: string;
  model: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  steps: number;
  groundedClaims: number | null;
  droppedClaims: number | null;
  createdAt: string;
};

export async function getRunCosts(limit = 25): Promise<RunCost[]> {
  const db = appStore();
  const result = await db.execute(sql`
    select
      b.session_id,
      b.account_id,
      max(m.model)                         as model,
      coalesce(sum(m.cost_usd), 0)         as cost_usd,
      coalesce(sum(m.input_tokens), 0)     as input_tokens,
      coalesce(sum(m.output_tokens), 0)    as output_tokens,
      count(m.id)                          as steps,
      b.grounded_claims,
      b.dropped_claims,
      b.created_at
    from brief_runs b
    left join model_runs m on m.session_id = b.session_id
    group by b.id
    order by b.created_at desc
    limit ${limit}
  `);
  const rows = (result as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  return rows.map((r) => ({
    sessionId: (r.session_id as string) ?? null,
    accountId: r.account_id as string,
    model: (r.model as string) ?? null,
    costUsd: Number(r.cost_usd ?? 0),
    inputTokens: Number(r.input_tokens ?? 0),
    outputTokens: Number(r.output_tokens ?? 0),
    steps: Number(r.steps ?? 0),
    groundedClaims: r.grounded_claims == null ? null : Number(r.grounded_claims),
    droppedClaims: r.dropped_claims == null ? null : Number(r.dropped_claims),
    createdAt: String(r.created_at),
  }));
}
