import { defineTool } from "eve/tools";
import { BriefInput } from "../../lib/brief/schema";
import { recordBriefRun } from "../../lib/appstore/runs";
import { explainRefusal, resolveAccountForCaller } from "../../lib/auth/access";
import { callerFromSession } from "../../lib/auth/scope";
import { describeUnresolved } from "../../lib/citations/registry";
import { readEvidence } from "../../lib/evidence/ledger";
import { enforceCitations } from "../../lib/grounding/gate";
import { getSalesforceAccount } from "../../lib/salesforce/adapter";
import { getKnownActivityIds } from "../../lib/warehouse/repository";

// The one and only way to deliver a brief. The model provides its claims here; this tool runs the
// deterministic grounding gate over them, drops anything not backed by a real activity, persists the
// run, and returns the shipped brief plus what it withheld. Because the gate lives in the tool's
// execute, no brief can bypass it: the model cannot ship prose it wrote directly.

export default defineTool({
  description:
    "Emit the finished weekly brief. This is the ONLY way to deliver a brief; do not write the brief as plain text. Provide the summary, next steps, and stage read as discrete claims, each with the activity ids that back it. The gate drops any claim not backed by a real activity id and returns it under needsReview. Ground every claim or it will not ship.",
  inputSchema: BriefInput,
  async execute(brief, ctx) {
    // Checked again here rather than trusted from the read tools. A brief is the thing that actually
    // leaves the building, so the last gate before delivery re-establishes entitlement instead of
    // assuming an earlier tool call did.
    const caller = callerFromSession(ctx.session);
    if (!caller) {
      return { shipped: false, reason: "Sign in to run a brief." };
    }

    const resolved = await resolveAccountForCaller(caller, brief.account);
    if (!resolved.ok) {
      return { shipped: false, reason: explainRefusal(resolved) };
    }
    const accountId = resolved.account.accountId;

    // Three ways an id becomes citable, and they are genuinely different claims.
    //
    // A warehouse id is citable because a row exists in fct_account_activity. A Salesforce id is
    // citable because the adapter returned that record just now. A Linear or Notion id is citable
    // because a read tool recorded it in the evidence ledger during this session, for this account,
    // which is the only check available for a system we hold no table for.
    //
    // That last one is stricter than it looks. It means the model may cite only what it actually
    // read, in this run, for this account. An id carried over from another account earlier in the
    // same Slack thread does not resolve, and neither does an issue key composed from memory.
    const [activityIds, sfdc, live] = await Promise.all([
      getKnownActivityIds(accountId),
      getSalesforceAccount(accountId),
      readEvidence(ctx.session.id, accountId),
    ]);
    const knownIds = new Set(activityIds);
    if (sfdc) {
      knownIds.add(sfdc.accountId);
      for (const opp of sfdc.opportunities) knownIds.add(opp.oppId);
      for (const contact of sfdc.contacts) knownIds.add(contact.contactId);
    }
    for (const id of live.keys()) knownIds.add(id);

    const result = enforceCitations(brief, knownIds, describeUnresolved);

    // The clickable half of a citation. Warehouse and Salesforce ids render as plain chips because
    // they resolve inside this app; Linear and Notion carry a url back to the record, so an engineer
    // who has never heard of Steve can click the evidence.
    const sources = result.citedIds.map((id) => live.get(id) ?? { citationId: id, source: null });

    let persisted = true;
    try {
      await recordBriefRun(accountId, result, { sessionId: ctx.session.id });
    } catch {
      // Persistence is for the audit trail, not correctness. A failure here must not block delivery.
      persisted = false;
    }

    // The resolved name travels with the brief. The gate returns everything except account and
    // accountId, because it works on claims and knows nothing about accounts, so without this the
    // Slack card renders a title reading "Weekly brief: undefined". Found by rendering a real brief
    // rather than a fixture, which is the argument for doing that.
    return {
      shipped: true,
      account: resolved.account.name,
      accountId,
      persisted,
      sources,
      ...result,
    };
  },
});
