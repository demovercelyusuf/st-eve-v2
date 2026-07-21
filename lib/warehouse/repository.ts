import { warehouseQuery } from "./client";

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
  activityType: "call" | "usage";
  occurredAt: string;
  summary: string;
  detail: string | null;
};

function toDate(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

// An owner filter is pushed into the query rather than applied to the results, so an account outside
// the caller's book is never read in the first place. Null means unscoped, which is how leadership
// reads everything without a second query.
export async function listAccounts(ownerSe: string | null = null): Promise<AccountSummary[]> {
  const { rows } = await warehouseQuery(
    `select account_id, name, industry, segment, arr, se_owner, slack_channel
       from activity.dim_account
      where $1::text is null or se_owner = $1
      order by name asc`,
    [ownerSe],
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

export type AccountRef = { accountId: string; name: string; seOwner: string };

// Resolves free text to an account and reports who owns it. Deliberately unscoped: this answers "what
// did they mean", and lib/auth/access.ts answers "may they see it". Keeping the two apart means the
// caller can be told an account exists but belongs to someone else, which is more useful inside one
// company than pretending it does not exist, and it keeps authorization in one auditable place rather
// than smeared across every query.
export async function findAccount(query: string): Promise<AccountRef | null> {
  const { rows } = await warehouseQuery(
    `select account_id, name, se_owner from activity.dim_account
      where account_id = $1 or name ilike '%' || $1 || '%'
      order by (account_id = $1) desc
      limit 1`,
    [query.trim()],
  );
  const row = rows[0];
  return row ? { accountId: row.account_id, name: row.name, seOwner: row.se_owner } : null;
}

export async function findAccountId(query: string): Promise<string | null> {
  return (await findAccount(query))?.accountId ?? null;
}

// The account's identity, read from the warehouse dimension rather than from Salesforce.
//
// The account page used to take its name and industry from the CRM adapter and call notFound() when
// that returned nothing, which meant a Salesforce outage rendered as "this account does not exist".
// Identity belongs to the source that must be up for the page to have a reason to exist at all, so
// the warehouse answers "who is this" and the CRM answers "what is the deal doing". A CRM failure
// then degrades one panel instead of 404ing the whole account.
export async function getAccount(accountId: string): Promise<AccountSummary | null> {
  const { rows } = await warehouseQuery(
    `select account_id, name, industry, segment, arr, se_owner, slack_channel
       from activity.dim_account
      where account_id = $1`,
    [accountId],
  );
  const r = rows[0];
  return r
    ? {
        accountId: r.account_id,
        name: r.name,
        industry: r.industry,
        segment: r.segment,
        arr: r.arr,
        seOwner: r.se_owner,
        slackChannel: r.slack_channel,
      }
    : null;
}

export async function getAccountActivity(accountId: string): Promise<ActivityRow[]> {
  const { rows } = await warehouseQuery(
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
  const { rows } = await warehouseQuery(
    `select activity_id from activity.fct_account_activity where account_id = $1`,
    [accountId],
  );
  return new Set(rows.map((r) => r.activity_id as string));
}
