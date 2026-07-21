import { ALL_ACCOUNTS } from "../lib/seed";

// Creates the Notion side of the demo: one page per account holding its meeting notes, written from
// the same calls that sit in the warehouse.
//
// Like the Linear seeder this runs on a personal integration token that the app never uses. Seeding
// is an operator task; the agent reads with its own credential. Keeping them separate is the whole
// reason a long-lived token like this one does not end up in the deployment.
//
// Idempotent by page title under the parent. Notion has no upsert, so a re-run finds the existing
// page and skips it rather than creating a second copy of the same account.

const API = "https://api.notion.com/v1";
const KEY = process.env.NOTION_SEED_KEY;
const PARENT = process.env.NOTION_PARENT_PAGE_ID;

if (!KEY) throw new Error("NOTION_SEED_KEY is not set");
if (!PARENT) throw new Error("NOTION_PARENT_PAGE_ID is not set");

async function notion<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KEY}`,
      "Notion-Version": "2022-06-28",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { object?: string; code?: string; message?: string } & T;
  if (json.object === "error") throw new Error(`${json.code}: ${json.message}`);
  return json;
}

// Notion caps a single rich_text object at 2,000 characters. Transcripts are model-written prose with
// no length guarantee, so clamping here is the difference between a seeded page and a 400.
function text(content: string) {
  return [{ type: "text", text: { content: content.slice(0, 1900) } }];
}

function heading(content: string) {
  return { object: "block", type: "heading_2", heading_2: { rich_text: text(content) } };
}

function para(content: string) {
  return { object: "block", type: "paragraph", paragraph: { rich_text: text(content) } };
}

function callout(content: string) {
  return {
    object: "block",
    type: "callout",
    callout: { rich_text: text(content), icon: { type: "emoji", emoji: "🔗" } },
  };
}

function blocksFor(account: (typeof ALL_ACCOUNTS)[number]) {
  const blocks: unknown[] = [
    callout(
      `${account.name} · ${account.accountId} · ${account.industry} · ${account.segment}. ${account.situation}`,
    ),
  ];

  for (const call of account.calls) {
    blocks.push(heading(`${call.callDate} · ${call.title}`));
    blocks.push(para(`Attendees: ${call.participants}`));
    blocks.push(para(call.transcript));
    if (call.committedNextStep) {
      blocks.push(
        para(`Committed next step: ${call.committedNextStep} (${call.nextStepStatus ?? "none"})`),
      );
    }
    // The Gong id travels with the note so a reader can get from this page back to the record the
    // brief cited. Without it the two systems read as two unrelated sets of notes.
    blocks.push(para(`Source: ${call.callId}`));
    blocks.push({ object: "block", type: "divider", divider: {} });
  }

  return blocks;
}

async function main() {
  const existing = await notion<{ results: Array<{ id: string; properties?: Record<string, unknown> }> }>(
    "/search",
    { query: "Account notes", page_size: 100 },
  );
  const seen = new Set(
    existing.results.map((r) => {
      const title = (r.properties as { title?: { title?: Array<{ plain_text?: string }> } } | undefined)
        ?.title?.title?.[0]?.plain_text;
      return title ?? "";
    }),
  );

  let created = 0;
  let skipped = 0;

  for (const account of ALL_ACCOUNTS) {
    const title = `Account notes: ${account.name} (${account.accountId})`;
    if (seen.has(title)) {
      skipped += 1;
      console.log(`${account.accountId} already present`);
      continue;
    }

    await notion("/pages", {
      parent: { page_id: PARENT },
      properties: { title: { title: text(title) } },
      children: blocksFor(account).slice(0, 100),
    });
    created += 1;
    console.log(`${account.accountId} ${account.name}: ${account.calls.length} meetings`);
  }

  console.log(`\ncreated ${created}, already present ${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
