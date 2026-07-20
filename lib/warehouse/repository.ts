import { warehousePool } from "./client";

// Read-only access to the account-activity warehouse. This is the "read across the boundary in
// bulk" path: history keyed by account_id, every row carrying a citable activity id. Nothing here
// writes; the copilot only ever reads what the customer's systems already recorded.

export type AccountSummary = {
  accountId: string;
  name: string;
  industry: string;
  segment: string | null;
  arr: number;
  seOwner: string;
  slackChannel: string | null;
};

export type ActivityRow = {
  activityId: string;
  accountId: string;
  activityType: "ticket" | "call" | "usage";
  occurredAt: string;
  summary: string;
  detail: string | null;
};

function toDate(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const { rows } = await warehousePool().query(
    `select account_id, name, industry, segment, arr, se_owner, slack_channel
       from activity.dim_account
      order by name asc`,
  );
  return rows.map((r) => ({
    accountId: r.account_id,
    name: r.name,
    industry: r.industry,
    segment: r.segment,
    arr: r.arr,
    seOwner: r.se_owner,
    slackChannel: r.slack_channel,
  }));
}

export async function findAccountId(query: string): Promise<string | null> {
  const { rows } = await warehousePool().query(
    `select account_id from activity.dim_account
      where account_id = $1 or name ilike '%' || $1 || '%'
      order by (account_id = $1) desc
      limit 1`,
    [query.trim()],
  );
  return rows[0]?.account_id ?? null;
}

export async function getAccountActivity(accountId: string): Promise<ActivityRow[]> {
  const { rows } = await warehousePool().query(
    `select activity_id, account_id, activity_type, occurred_at, summary, detail
       from activity.fct_account_activity
      where account_id = $1
      order by occurred_at asc, activity_id asc`,
    [accountId],
  );
  return rows.map((r) => ({
    activityId: r.activity_id,
    accountId: r.account_id,
    activityType: r.activity_type,
    occurredAt: toDate(r.occurred_at),
    summary: r.summary,
    detail: r.detail,
  }));
}

// The set of activity ids that actually exist for an account. The grounding gate uses this to
// verify every citation resolves to a real row before a brief ships.
export async function getKnownActivityIds(accountId: string): Promise<Set<string>> {
  const { rows } = await warehousePool().query(
    `select activity_id from activity.fct_account_activity where account_id = $1`,
    [accountId],
  );
  return new Set(rows.map((r) => r.activity_id as string));
}
