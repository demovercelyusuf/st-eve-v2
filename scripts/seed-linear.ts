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

async function existingTitles(labelId: string): Promise<Set<string>> {
  const found = await gql<{ issues: { nodes: Array<{ title: string }> } }>(
    `query($id:ID!){ issues(filter:{labels:{id:{eq:$id}}}, first:100){ nodes { title } } }`,
    { id: labelId },
  );
  return new Set(found.issues.nodes.map((n) => n.title));
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const account of ALL_ACCOUNTS) {
    const labelId = await labelFor(account.accountId);
    const already = await existingTitles(labelId);

    for (const ticket of account.tickets) {
      const title = ticket.subject;
      if (already.has(title)) {
        skipped += 1;
        continue;
      }

      // The warehouse id travels in the body on purpose. It is how a human reading the Linear issue
      // gets back to the record the brief cited, and it is what makes the two systems legible as one
      // account story rather than two unrelated lists.
      const description = [
        ticket.body,
        "",
        `**Account:** ${account.name} (\`${account.accountId}\`)`,
        `**Support ticket:** \`${ticket.ticketId}\` · ${ticket.priority} · ${ticket.status}${ticket.slaBreached ? " · SLA breached" : ""}`,
        `**Raised:** ${ticket.createdAt}`,
        "",
        "_Seeded for the Steve demo from the account activity warehouse._",
      ].join("\n");

      await gql(
        `mutation($input:IssueCreateInput!){ issueCreate(input:$input){ success } }`,
        {
          input: {
            teamId: TEAM,
            title,
            description,
            labelIds: [labelId],
            priority: PRIORITY[ticket.priority] ?? 3,
          },
        },
      );
      created += 1;
    }

    console.log(`${account.accountId} ${account.name}: ${account.tickets.length} tickets`);
  }

  console.log(`\ncreated ${created}, already present ${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
