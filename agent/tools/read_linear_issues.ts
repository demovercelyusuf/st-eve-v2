import { connect } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { explainRefusal, resolveAccountForCaller } from "../../lib/auth/access";
import { callerFromSession } from "../../lib/auth/scope";
import { recordEvidence } from "../../lib/evidence/ledger";
import { LinearUnauthorized, fetchAccountIssues, linearCitationId } from "../../lib/linear/issues";

// Engineering's view of the account: what the customer's evaluation actually raised against us.
//
// Hand written rather than an MCP connection, and that is the load-bearing choice. A connection would
// expose the whole Linear workspace to the model through connection_search, and the account scope
// would have to live in a prompt instruction. A prompt is a suggestion; the label filter here is a
// boundary. This project spent its design budget removing capability from the agent, and adding a
// browsable workspace API back would undo that in one file.
//
// The credential is the asking user's own, because connect() defaults to a user subject. Steve sees
// the issues that person can already see, which is a permission model we inherit rather than build.

const LINEAR_CONNECTOR = "linear/byzantine-pebble";

// App-scoped, not user-scoped, and that choice is what makes Linear work at all here.
//
// connect(connector) defaults to a user subject, which needs each person to complete a device-code
// handshake before their first read, which is a real cost for a source read on every brief.
// Linear's connector carries app scopes as well, and the app is already installed in the workspace,
// so an app token needs no per-person grant and every SE sees the same account issues.
//
// The tradeoff, stated rather than hidden: an app token sees every issue the installation can, not
// only what the asking SE could. For issues labelled by account in a shared team that is the same
// set. It would not be for a workspace with private teams, and the honest fix there is the user
// subject plus the handshake, not a filter we apply after the fact.
function linearAuth() {
  return connect({ connector: LINEAR_CONNECTOR, principalType: "app" });
}

export default defineTool({
  description:
    "Read the engineering issues raised against an account in Linear: blockers, defects and feature asks from a pilot or evaluation, each with a citable id (for example LIN-VAN-412). Accepts an account name or id. Use these ids as citations for any claim about engineering work or a technical blocker.",
  inputSchema: z.object({
    account: z
      .string()
      .min(1)
      .describe("Account name or id, for example 'Northwind' or 'ACC-2041'"),
  }),
  async execute({ account }, ctx) {
    const caller = callerFromSession(ctx.session);
    if (!caller) return { found: false, account, message: "Sign in to read Linear." };

    const resolved = await resolveAccountForCaller(caller, account);
    if (!resolved.ok) return { found: false, account, message: explainRefusal(resolved) };

    const { accountId, name } = resolved.account;

    // The label convention is the customer's configuration, not ours: issues carrying the account id
    // are the ones about that account. Stated in the tool so a missing label reads as "nothing is
    // labelled" rather than "this account has no engineering work", which is a claim a brief might
    // otherwise make.
    const label = accountId;

    // Deliberately NOT ctx.requireAuth here, and this was learned the hard way. requireAuth parks the
    // whole turn waiting for a grant, so on a workspace nobody has authorized yet the agent stopped
    // after reading the warehouse and Salesforce and never reached emit_brief. No brief at all,
    // because one enrichment source was not connected.
    //
    // Linear is not on the critical path. The brief stands on warehouse activity and the CRM record;
    // engineering issues make it richer, not true. So a missing grant is reported as a fact about
    // coverage and the run continues, which is also the more honest output: say what was read, and
    // say what could not be checked.
    //
    // requireAuth is still the right call for a tool whose entire purpose is the connected system.
    // This one has somewhere to fall back to.
    const notConnected = {
      found: false,
      accountId,
      account: name,
      connected: false,
      count: 0,
      issues: [],
      message:
        "Linear is not connected for this user, so engineering issues were not read. Continue the brief without them and note that Linear was not consulted.",
    };

    let token: string;
    try {
      ({ token } = await ctx.getToken(linearAuth()));
    } catch {
      return notConnected;
    }

    let issues;
    try {
      issues = await fetchAccountIssues(token, label);
    } catch (error) {
      if (error instanceof LinearUnauthorized) return notConnected;
      throw error;
    }

    // Recorded before the model sees them, and this is what makes them citable at all: there is no
    // table on our side for the gate to check a Linear id against, so "we read this, in this run, for
    // this account" is the check.
    await recordEvidence(
      ctx.session.id,
      accountId,
      issues.map((i) => ({
        citationId: linearCitationId(i.identifier),
        source: "linear" as const,
        label: `${i.identifier} ${i.title}`,
        url: i.url,
      })),
    );

    return {
      found: true,
      accountId,
      account: name,
      label,
      count: issues.length,
      issues: issues.map((i) => ({ citationId: linearCitationId(i.identifier), ...i })),
    };
  },
});
