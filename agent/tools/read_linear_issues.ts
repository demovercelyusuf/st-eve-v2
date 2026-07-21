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

    // requireAuth parks the turn and asks the user to authorize rather than failing, so the first run
    // against a workspace nobody has granted yet ends in a sign-in prompt instead of an error. It
    // returns never, and returning it says so to the type checker as well as the reader.
    let token: string;
    try {
      ({ token } = await ctx.getToken(connect(LINEAR_CONNECTOR)));
    } catch {
      return ctx.requireAuth(connect(LINEAR_CONNECTOR));
    }

    let issues;
    try {
      issues = await fetchAccountIssues(token, label);
    } catch (error) {
      // A rejected token is fixable by the person asking; anything else is not, so only the first
      // becomes a prompt and the rest surface as failures.
      if (error instanceof LinearUnauthorized) return ctx.requireAuth(connect(LINEAR_CONNECTOR));
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
