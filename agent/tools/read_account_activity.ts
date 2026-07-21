import { defineTool } from "eve/tools";
import { z } from "zod";
import { explainRefusal, resolveAccountForCaller } from "../../lib/auth/access";
import { callerFromSession } from "../../lib/auth/scope";
import { getAccountActivity } from "../../lib/warehouse/repository";

// Reads an account's history from the warehouse: Zendesk-shaped tickets, Gong-shaped call notes, and
// product-usage trends, each row carrying a citable activity id (ZD-, GONG-, USG-). This is the
// "read across the boundary in bulk" path. Every claim in a brief must cite one of these ids.
export default defineTool({
  description:
    "Read an account's activity history from the warehouse: support tickets, call notes, and product-usage trends, each with a citable activity id (for example ZD-4471, GONG-902, USG-2207). Accepts an account name or id. Use these ids as citations in the brief.",
  inputSchema: z.object({
    account: z
      .string()
      .min(1)
      .describe("Account name or id, for example 'Northwind' or 'ACC-2041'"),
  }),
  async execute({ account }, ctx) {
    const caller = callerFromSession(ctx.session);
    if (!caller) return { found: false, account, message: "Sign in to read account activity." };

    const resolved = await resolveAccountForCaller(caller, account);
    if (!resolved.ok) return { found: false, account, message: explainRefusal(resolved) };

    const activity = await getAccountActivity(resolved.account.accountId);
    return { found: true, accountId: resolved.account.accountId, count: activity.length, activity };
  },
});
