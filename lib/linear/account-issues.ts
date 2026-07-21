import { getToken } from "@vercel/connect";
import {
  LINEAR_CONNECTOR,
  LinearUnauthorized,
  fetchAccountIssues,
  fetchOpenIssueCounts,
  type LinearIssue,
} from "./issues";

// Linear for a reader, not for the agent.
//
// The read tool mints its token through connect() from @vercel/connect/eve, which needs an eve
// session to hang the authorization on. A server component has no session, so it goes to the SDK's
// core getToken with the same connector and the same app subject. Same credential, same scopes, one
// fewer layer, and nothing about the agent path changes.
//
// The alternative considered and rejected was having the page call the agent's read tool. That would
// mean spinning up a session to render a list, and it would write to the evidence ledger, which is
// the record of what a brief run read. Polluting that with page views would make the ledger useless
// as an audit of what a brief was allowed to cite.

export type LinearRead =
  | { connected: true; issues: LinearIssue[] }
  | { connected: false; reason: string };

// Fails soft on purpose, the same way the tool does. Linear is a live network read over someone
// else's API during a page render: it is the one source here that can be down while the account is
// perfectly fine. A rejected promise would take the Suspense boundary with it and lose the warehouse
// and CRM evidence too, so every failure mode collapses into "not connected, and here is why".
export async function readAccountIssues(accountId: string): Promise<LinearRead> {
  let token: string;
  try {
    token = await getToken(LINEAR_CONNECTOR, { subject: { type: "app" } });
  } catch {
    return {
      connected: false,
      reason: "Linear is not connected for this workspace, so engineering issues were not read.",
    };
  }

  try {
    // The account id is the label. That convention is the customer's configuration, so an account
    // with no matching label reads as an empty connected result rather than a failure, which is the
    // honest distinction: nothing is labelled is not the same as nothing was raised.
    return { connected: true, issues: await fetchAccountIssues(token, accountId) };
  } catch (error) {
    if (error instanceof LinearUnauthorized) {
      return { connected: false, reason: "The Linear grant has expired, so issues were not read." };
    }
    return { connected: false, reason: "Linear did not respond, so issues were not read." };
  }
}

// ---------------------------------------------------------------------------
// Patch-wide open issue counts, for the list surfaces
// ---------------------------------------------------------------------------

export type PatchIssueCounts = {
  // Whether Linear was actually read. False means "we do not know", which every consumer has to
  // render differently from zero. An account with no open issues and an account we could not check
  // are the same shape on screen unless this distinction is carried all the way to the cell.
  connected: boolean;
  // False when the counts are floors rather than totals, because the query hit its page cap.
  complete: boolean;
  openByAccount: Record<string, number>;
};

const NOT_CONSULTED: PatchIssueCounts = { connected: false, complete: true, openByAccount: {} };

// A list view is not worth a slow page. This read sits on the critical path of the patch query, so it
// gets a wall-clock budget: past this, Linear is treated as not consulted and the table renders with
// one column blank rather than holding the whole patch hostage to a third party's latency.
//
// The alternative was a second Suspense boundary streaming the counts in after the table. Rejected
// because the column is sortable, and a column that arrives late reorders the table under the reader's
// cursor. A blank column that fills on the next request is less of a lie than a table that moves.
const BUDGET_MS = 2_000;

// Short-lived process memo, deliberately not `use cache`. This mints a Connect token, which is
// request-adjacent work that has no business inside a cache scope, and the counts are cheap enough
// that a per-instance TTL buys back nearly all of the round trip anyway. Fluid Compute reuses
// instances, so in practice most renders never touch Linear at all.
const MEMO_TTL_MS = 60_000;
let memo: { key: string; at: number; value: PatchIssueCounts } | undefined;

// getToken takes no signal, so the budget is enforced by racing the whole sequence rather than by
// aborting one fetch. A token mint that hangs is exactly as bad for the page as a query that hangs.
async function withBudget<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const signal = AbortSignal.timeout(ms);
  const expired = new Promise<null>((resolve) => {
    signal.addEventListener("abort", () => resolve(null), { once: true });
  });
  return Promise.race([run(signal), expired]);
}

// Fails soft in every direction, the same way readAccountIssues does: no grant, a revoked token, an
// outage and a slow response all land on "not consulted". Linear enriches the patch view, it does not
// establish it, so a dashboard that cannot reach Linear is a dashboard with one column missing rather
// than an error page.
export async function readPatchIssueCounts(accountIds: string[]): Promise<PatchIssueCounts> {
  // No accounts means nothing to ask about, so there is nothing to report as incomplete. This is
  // correct for the dashboard, which is the only caller that reaches it — with an empty patch there
  // is no column to fill. It is not a claim that Linear is reachable, and the integrations page used
  // to read it as one. See pingLinear below.
  if (accountIds.length === 0) return { connected: true, complete: true, openByAccount: {} };

  const key = [...accountIds].sort().join(",");
  if (memo && memo.key === key && Date.now() - memo.at < MEMO_TTL_MS) return memo.value;

  const counts = await withBudget(BUDGET_MS, async (signal) => {
    const token = await getToken(LINEAR_CONNECTOR, { subject: { type: "app" } });
    // Account ids are the labels, so we ask for exactly the ones in this patch. Asking by prefix
    // would let both reads start at once, but it would also count a label that merely looks like an
    // account id, and a wrong number in a scannable column is worse than a slightly later one.
    return fetchOpenIssueCounts(token, accountIds, signal);
  }).catch(() => null);

  const value: PatchIssueCounts = counts ? { connected: true, ...counts } : NOT_CONSULTED;
  memo = { key, at: Date.now(), value };
  return value;
}

// Is the Linear grant actually good right now?
//
// This exists because the integrations page had no way to ask. It called readPatchIssueCounts([]),
// which short-circuits on an empty list and returns connected: true without a network call, so the
// Linear row rendered "connected" unconditionally — including with the grant revoked — on the one
// page whose entire claim is that status is measured rather than declared. The rejection handler
// beside that call was unreachable code.
//
// Minting the token is the check. It is what actually fails when a grant is revoked or expired, and
// it is cheap enough to do on a page load. Under the same budget as everything else here, because a
// hung token mint should degrade this row, not the page.
// Asking whether a grant is valid right now is dynamic by definition — the answer depends on when
// you ask — and the budget below reads the clock to enforce its timeout, which Cache Components
// rejects in a render it still believes is prerenderable. Declared here for the same reason and in
// the same way the warehouse pool declares it, dynamic import and swallowed failure included,
// because this also runs outside a Next render.
//
// Worth noting that the bug this function replaces was holding the build up: the old empty-list
// short-circuit returned before touching a clock, so the page prerendered by never actually
// checking anything.
export async function pingLinear(): Promise<boolean> {
  try {
    const { connection } = await import("next/server");
    await connection();
  } catch {
    // Not inside a Next render. Nothing to declare.
  }

  const token = await withBudget(BUDGET_MS, () =>
    getToken(LINEAR_CONNECTOR, { subject: { type: "app" } }),
  ).catch(() => null);
  return token !== null;
}
