import { warehousePool } from "../warehouse/client";

// The SE's patch as one read model for the dashboard and the stage board: each account with its
// primary open opportunity (stage, amount, close date, next step, risk) and a rollup of its warehouse
// activity. This is the copilot's consolidated view; it reads the warehouse dimension and the mocked
// Salesforce schema together for a list view, while a single account's live CRM read still goes
// through the Salesforce adapter.

export type PatchRow = {
  accountId: string;
  name: string;
  industry: string;
  segment: string | null;
  arr: number;
  slackChannel: string | null;
  oppId: string | null;
  oppName: string | null;
  stage: string | null;
  amount: number | null;
  closeDate: string | null;
  nextStep: string | null;
  riskFlag: string | null;
  activityCount: number;
  lastActivity: string | null;
};

function toDate(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

export async function getPatchOverview(): Promise<PatchRow[]> {
  const { rows } = await warehousePool().query(`
    select
      d.account_id, d.name, d.industry, d.segment, d.arr, d.slack_channel,
      o.opp_id, o.opp_name, o.stage, o.amount, o.close_date, o.next_step, o.risk_flag,
      coalesce(ac.n, 0) as activity_count, ac.last_activity
    from activity.dim_account d
    left join lateral (
      select opp_id, name as opp_name, stage, amount, close_date, next_step, risk_flag
        from sfdc.opportunities o2
       where o2.account_id = d.account_id
       order by (o2.stage not in ('Closed Won', 'Closed Lost')) desc, o2.close_date asc nulls last
       limit 1
    ) o on true
    left join lateral (
      select count(*)::int as n, max(occurred_at) as last_activity
        from activity.fct_account_activity a
       where a.account_id = d.account_id
    ) ac on true
    order by (o.risk_flag = 'At Risk') desc, d.name asc
  `);

  return rows.map((r) => ({
    accountId: r.account_id,
    name: r.name,
    industry: r.industry,
    segment: r.segment,
    arr: r.arr,
    slackChannel: r.slack_channel,
    oppId: r.opp_id,
    oppName: r.opp_name,
    stage: r.stage,
    amount: r.amount,
    closeDate: toDate(r.close_date),
    nextStep: r.next_step,
    riskFlag: r.risk_flag,
    activityCount: r.activity_count,
    lastActivity: toDate(r.last_activity),
  }));
}
