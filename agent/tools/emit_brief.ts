import { defineTool } from "eve/tools";
import { BriefInput } from "../../lib/brief/schema";
import { recordBriefRun } from "../../lib/appstore/runs";
import { enforceCitations } from "../../lib/grounding/gate";
import { findAccountId, getKnownActivityIds } from "../../lib/warehouse/repository";

// The one and only way to deliver a brief. The model provides its claims here; this tool runs the
// deterministic grounding gate over them, drops anything not backed by a real activity, persists the
// run, and returns the shipped brief plus what it withheld. Because the gate lives in the tool's
// execute, no brief can bypass it: the model cannot ship prose it wrote directly.

export default defineTool({
  description:
    "Emit the finished weekly brief. This is the ONLY way to deliver a brief; do not write the brief as plain text. Provide the summary, next steps, and stage read as discrete claims, each with the activity ids that back it. The gate drops any claim not backed by a real activity id and returns it under needsReview. Ground every claim or it will not ship.",
  inputSchema: BriefInput,
  async execute(brief) {
    const accountId = await findAccountId(brief.account);
    if (!accountId) {
      return { shipped: false, reason: `No account matches "${brief.account}".` };
    }

    const knownIds = await getKnownActivityIds(accountId);
    const result = enforceCitations(brief, knownIds);

    let persisted = true;
    try {
      await recordBriefRun(accountId, result);
    } catch {
      // Persistence is for the audit trail, not correctness. A failure here must not block delivery.
      persisted = false;
    }

    return { shipped: true, accountId, persisted, ...result };
  },
});
