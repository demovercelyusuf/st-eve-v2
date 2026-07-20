import { defineTool } from "eve/tools";
import { z } from "zod";
import { explainRefusal, resolveAccountForCaller } from "../../lib/auth/access";
import { callerFromSession } from "../../lib/auth/scope";
import { getSalesforceAccount } from "../../lib/salesforce/adapter";

// Reads an account's live Salesforce record through the CRM adapter: the current opportunity, stage,
// amount, close date, and contacts (including who the champion is and whether they are still active).
// This is the present truth of the deal, read one record at a time, separate from the warehouse.
export default defineTool({
  description:
    "Read an account's live Salesforce record: the current opportunity, stage, amount, close date, and contacts, including who the champion is and whether they are still active. This is the current state of the deal. Accepts an account name or id.",
  inputSchema: z.object({
    account: z
      .string()
      .min(1)
      .describe("Account name or id, for example 'Northwind' or 'ACC-2041'"),
  }),
  async execute({ account }, ctx) {
    const caller = callerFromSession(ctx.session);
    if (!caller) return { found: false, account, message: "Sign in to read the CRM record." };

    const resolved = await resolveAccountForCaller(caller, account);
    if (!resolved.ok) return { found: false, account, message: explainRefusal(resolved) };

    const record = await getSalesforceAccount(resolved.account.accountId);
    return record ? { found: true, ...record } : { found: false, account };
  },
});
