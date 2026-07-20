import { defineTool } from "eve/tools";
import { z } from "zod";
import { listAccounts } from "../../lib/warehouse/repository";

// Lists the SE's patch so the agent can find the right account before reading its detail.
export default defineTool({
  description:
    "List the accounts on the Solutions Engineer's patch, with id, name, industry, segment, and ARR. Use this first to find the account the user means before reading its activity or Salesforce record.",
  inputSchema: z.object({}),
  async execute() {
    const accounts = await listAccounts();
    return { count: accounts.length, accounts };
  },
});
