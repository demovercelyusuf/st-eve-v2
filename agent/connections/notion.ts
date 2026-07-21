import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { never } from "eve/tools/approval";

// Notion, over MCP, and this one goes the opposite way to Linear on purpose.
//
// Linear is a hand written tool because what an SE needs from it is one filterable query: the issues
// carrying this account's label. That belongs in a where clause. Notion is not that. What matters
// there is prose nobody modelled in advance, an account plan, a POC scoping doc, a set of exit
// criteria written differently by every team, and the useful operation is open ended traversal. That
// is what MCP is for, and hand writing a search API over it would be inventing a schema the customer
// never agreed to.
//
// The safety argument that makes this acceptable: MCP reads, authored code cites. Nothing an MCP tool
// returns can mint a citation id. Citability comes from the evidence ledger, which only authored
// tools write to, so a broad read surface stays context rather than becoming assertable fact. That is
// also why Steve does not write anywhere: a broad read surface is context, a broad write surface is
// blast radius.
//
// approval: never() because every operation reachable here is a read, and prompting for each one
// would train the operator to click through prompts, which is worse than not asking.
//
// The credential is the asking user's own. Notion issues user-subject tokens only, so there is no app
// scoped alternative to fall back to; the first run without a grant surfaces a sign-in prompt in the
// thread, and eve drives that handshake.
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace: account plans, POC scoping documents, architecture notes and meeting notes. Search here for the written context behind an account's technical evaluation, especially agreed exit criteria and requirements the customer wrote down themselves.",
  auth: connect("notion.so/citrine-leaf"),
  approval: never(),
});
