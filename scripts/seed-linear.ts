import { ALL_ACCOUNTS } from "../lib/seed";

// Creates the Linear side of the demo: one issue per seeded support ticket, labelled with the account
// id so read_linear_issues can find them with a filter rather than a prompt instruction.
//
// This runs with a personal API key, deliberately, and the running app never uses it. Seeding is an
// operator task and reading is the agent's, so they authenticate differently: the app reaches Linear
// through Vercel Connect. Mixing the two would put a long-lived token in the deployment, which is the
// thing Connect exists to remove.
//
// Idempotent by title within a label. Re-running reconciles rather than duplicating, because a demo
// gets seeded more than once and duplicate issues would make the account look busier than it is.

const API = "https://api.linear.app/graphql";
const KEY = process.env.LINEAR_SEED_KEY;
const TEAM = process.env.LINEAR_TEAM_ID;

if (!KEY) throw new Error("LINEAR_SEED_KEY is not set");
if (!TEAM) throw new Error("LINEAR_TEAM_ID is not set");

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API, {
    method: "POST",
    headers: { authorization: KEY as string, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data as T;
}

// Linear priority is 0 none, 1 urgent, 2 high, 3 medium, 4 low. P1 maps to high rather than urgent:
// urgent is a claim about someone's week that a seeding script has no standing to make.
const PRIORITY: Record<string, number> = { P1: 2, P2: 3, P3: 4 };

// Where each ticket lands in the team's workflow. Without this every issue is created in the team's
// default state, so a resolved ticket sits in the backlog looking open. That is not cosmetic: the
// healthy accounts are healthy precisely because their issues are closed, and an all-open queue
// erases the contrast the demo is built on.
//
// State ids are read at runtime rather than hardcoded, because they belong to the customer's team and
// a hardcoded id would break the moment this ran against a different workspace.
const STATE_FOR: Record<string, string> = {
  resolved: "completed",
  open: "unstarted",
  escalated: "started",
};

async function workflowStates(): Promise<Record<string, string>> {
  const data = await gql<{ workflowStates: { nodes: Array<{ id: string; type: string; name: string }> } }>(
    `query { workflowStates(first: 50) { nodes { id type name } } }`,
  );
  const byType: Record<string, string> = {};
  for (const node of data.workflowStates.nodes) {
    // First match wins. A team can have several states of one type (Backlog and Todo are both
    // unstarted); the earliest is the one Linear itself treats as the default for that type.
    if (!byType[node.type]) byType[node.type] = node.id;
  }
  return byType;
}

async function labelFor(accountId: string): Promise<string> {
  const existing = await gql<{ issueLabels: { nodes: Array<{ id: string; name: string }> } }>(
    `query($name:String!){ issueLabels(filter:{name:{eq:$name}}, first:1){ nodes { id name } } }`,
    { name: accountId },
  );
  if (existing.issueLabels.nodes[0]) return existing.issueLabels.nodes[0].id;

  const created = await gql<{ issueLabelCreate: { issueLabel: { id: string } } }>(
    `mutation($input:IssueLabelCreateInput!){ issueLabelCreate(input:$input){ issueLabel { id } } }`,
    { input: { name: accountId, teamId: TEAM, color: "#5E6AD2" } },
  );
  return created.issueLabelCreate.issueLabel.id;
}

type ExistingIssue = { id: string; title: string; stateId: string; description: string };

async function existingIssues(labelId: string): Promise<Map<string, ExistingIssue>> {
  const found = await gql<{
    issues: { nodes: Array<{ id: string; title: string; description: string | null; state: { id: string } }> };
  }>(
    `query($id:ID!){ issues(filter:{labels:{id:{eq:$id}}}, first:100){ nodes { id title description state { id } } } }`,
    { id: labelId },
  );
  return new Map(
    found.issues.nodes.map((n) => [
      n.title,
      { id: n.id, title: n.title, stateId: n.state.id, description: n.description ?? "" },
    ]),
  );
}

// Prefixes nothing mints any more. Kept in step with RETIRED_PREFIXES in lib/seed/examples.test.ts,
// which guards the same thing one layer up: that guard scans prose in the repo, this one repairs
// records already living in Linear, and neither can see what the other covers.
const RETIRED_PREFIXES = ["ZD-"];

function citesRetiredNamespace(text: string): boolean {
  return RETIRED_PREFIXES.some((prefix) => text.includes(prefix));
}

function describeTicket(
  ticket: (typeof ALL_ACCOUNTS)[number]["tickets"][number],
  account: (typeof ALL_ACCOUNTS)[number],
): string {
  // No warehouse id in the body. Support tickets used to live in the warehouse and were mirrored
  // here, which meant every issue carried a second id for the same thing. The warehouse no longer
  // holds tickets, so the Linear issue IS the ticket and its own identifier is the one that resolves.
  return [
    ticket.body,
    "",
    `**Account:** ${account.name} (\`${account.accountId}\`)`,
    `**Severity:** ${ticket.priority}${ticket.slaBreached ? " · SLA breached" : ""}`,
    `**Raised:** ${ticket.createdAt}`,
    "",
    "_Seeded for the Steve demo._",
  ].join("\n");
}

async function main() {
  const states = await workflowStates();
  let created = 0;
  let reconciled = 0;
  let repaired = 0;
  let skipped = 0;

  for (const account of ALL_ACCOUNTS) {
    const labelId = await labelFor(account.accountId);
    const already = await existingIssues(labelId);

    for (const ticket of account.tickets) {
      const title = ticket.subject;
      const wanted = states[STATE_FOR[ticket.status] ?? "unstarted"];

      // Reconcile rather than skip. An issue created before the status mapping existed sits in the
      // team's default state, so skipping it leaves a resolved ticket looking open forever and a
      // re-run can never repair it.
      //
      // The body is normally left alone, because it is the ticket's own words and a human may have
      // improved them since. The exception is a body still citing a namespace nothing mints any
      // more. Those came from a seed that predates tickets moving to Linear, and leaving them makes
      // the demo show a fourth system that no longer exists. Preserving an operator's edits is not
      // worth preserving a reference that cannot resolve.
      const found = already.get(title);
      if (found) {
        const input: Record<string, unknown> = {};
        if (found.stateId !== wanted) input.stateId = wanted;
        if (citesRetiredNamespace(found.description)) input.description = describeTicket(ticket, account);

        if (Object.keys(input).length > 0) {
          await gql(
            `mutation($id:String!,$input:IssueUpdateInput!){ issueUpdate(id:$id, input:$input){ success } }`,
            { id: found.id, input },
          );
          if (input.description) repaired += 1;
          if (input.stateId) reconciled += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      const description = describeTicket(ticket, account);

      await gql(
        `mutation($input:IssueCreateInput!){ issueCreate(input:$input){ success } }`,
        {
          input: {
            teamId: TEAM,
            title,
            description,
            labelIds: [labelId],
            priority: PRIORITY[ticket.priority] ?? 3,
            stateId: wanted,
          },
        },
      );
      created += 1;
    }

    console.log(`${account.accountId} ${account.name}: ${account.tickets.length} tickets`);
  }

  console.log(
    `\ncreated ${created}, state corrected ${reconciled}, body repaired ${repaired}, already correct ${skipped}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
