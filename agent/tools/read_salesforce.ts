import { defineTool } from "eve/tools";
import { z } from "zod";
import { getSalesforceAccount } from "../../lib/salesforce/adapter";
import { findAccountId } from "../../lib/warehouse/repository";

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
  async execute({ account }) {
    const accountId = await findAccountId(account);
    if (!accountId) {
      return { found: false, account, message: `No account matches "${account}".` };
    }
    const record = await getSalesforceAccount(accountId);
    return record ? { found: true, ...record } : { found: false, account };
  },
});
