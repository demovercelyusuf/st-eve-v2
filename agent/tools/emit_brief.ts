import { defineTool } from "eve/tools";
import { BriefInput } from "../../lib/brief/schema";
import { recordBriefRun } from "../../lib/appstore/runs";
import { explainRefusal, resolveAccountForCaller } from "../../lib/auth/access";
import { callerFromSession } from "../../lib/auth/scope";
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

    // Ground against both the warehouse activity ids (ZD-, GONG-, USG-) and the live Salesforce
    // record ids (the opportunity and its contacts), since a brief legitimately cites CRM facts,
    // like the deal amount or the departed champion, not just warehouse activity.
    const [activityIds, sfdc] = await Promise.all([
      getKnownActivityIds(accountId),
      getSalesforceAccount(accountId),
    ]);
    const knownIds = new Set(activityIds);
    if (sfdc) {
      knownIds.add(sfdc.accountId);
      for (const opp of sfdc.opportunities) knownIds.add(opp.oppId);
      for (const contact of sfdc.contacts) knownIds.add(contact.contactId);
    }

    const result = enforceCitations(brief, knownIds);

    let persisted = true;
    try {
      await recordBriefRun(accountId, result, { sessionId: ctx.session.id });
    } catch {
      // Persistence is for the audit trail, not correctness. A failure here must not block delivery.
      persisted = false;
    }

    return { shipped: true, accountId, persisted, ...result };
  },
});
