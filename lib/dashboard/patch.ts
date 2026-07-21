import { cache } from "react";
import { readPatchIssueCounts } from "../linear/account-issues";
import { warehouseQuery } from "../warehouse/client";

// The SE's patch as one read model for the dashboard and the stage board: each account with its
// primary open opportunity (stage, amount, close date, next step, risk), a rollup of its warehouse
// activity, and the engineering work still open against it. This is the copilot's consolidated view;
// it reads the warehouse dimension and the mocked Salesforce schema together for a list view, while a
// single account's live CRM read still goes through the Salesforce adapter.
//
// Linear joins here rather than in the page because "how loaded is this account" is a property of the
// patch, not of a component. The table sorts on it and the board colours a card by it, and neither
// surface should be the place that knows how to reach Linear.

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
  // Open engineering issues labelled with this account. null means Linear was not consulted, which is
  // a different fact from zero and has to survive all the way to the cell that renders it.
  openIssues: number | null;
};

// What was read and what was not, so a surface can say "Linear was not consulted" instead of
// implying every account is clean. Same shape of honesty the account timeline's coverage strip uses.
export type EngineeringCoverage = {
  connected: boolean;
  // False when the counts are floors rather than totals.
  complete: boolean;
};

export type PatchOverview = {
  rows: PatchRow[];
  engineering: EngineeringCoverage;
};

function toDate(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

// Deduped per request with react's cache. The patch view renders the KPI row and the account table
// from separate Suspense children, so an uncached export runs this twice: two warehouse round trips
// plus two Linear calls per page load. Worse than the cost, the two reads can disagree, and then the
// summary and the table contradict each other on the same screen.
export const getPatchOverview = cache(async (): Promise<PatchOverview> => {
  const { rows } = await warehouseQuery(`
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

  // Chained rather than parallel, because the label set is the account id set and we only learn it
  // from the query above. The cost of chaining is bounded by readPatchIssueCounts' own budget, so the
  // worst case is the SQL round trip plus two seconds, not an open-ended wait.
  const engineering = await readPatchIssueCounts(rows.map((r) => r.account_id as string));

  return {
    rows: rows.map((r) => ({
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
      // Absent from the map means no open issues, but only if Linear answered at all. When it did
      // not, every row is null, so nothing on screen can imply a clean account we never checked.
      openIssues: engineering.connected ? (engineering.openByAccount[r.account_id] ?? 0) : null,
    })),
    engineering: { connected: engineering.connected, complete: engineering.complete },
  };
});
