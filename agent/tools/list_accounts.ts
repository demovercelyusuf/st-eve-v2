import { defineTool } from "eve/tools";
import { z } from "zod";
import { callerFromSession } from "../../lib/auth/scope";
import { listAccounts } from "../../lib/warehouse/repository";

// Lists the SE's patch so the agent can find the right account before reading its detail.
//
// The patch is whoever is asking, not a fixed list. An unauthenticated turn resolves to no caller and
// reads nothing, which is the same rule the web surface applies: the agent is a second door onto the
// same data and it cannot be the looser one.
export default defineTool({
  description:
    "List the accounts on the asking Solutions Engineer's patch, with id, name, industry, segment, and ARR. Use this first to find the account the user means before reading its activity or Salesforce record. It returns only accounts the asker owns.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const caller = callerFromSession(ctx.session);
    if (!caller) {
      return { count: 0, accounts: [], message: "Sign in to see your accounts." };
    }
    const accounts = await listAccounts(caller.seOwner);
    return { count: accounts.length, accounts, patchOf: caller.name };
  },
});
