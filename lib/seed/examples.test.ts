import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_ACCOUNTS } from "./index";

// The agent's prompt names example citation ids so the model learns the shape. Those examples drifted
// once already: the seed was rewritten, GONG-882 and USG-2208 stopped existing, and the instructions
// went on teaching the model to produce ids that could never resolve. Nothing failed, because the
// prompt is prose and prose does not typecheck. The gate would have withheld the resulting claims,
// which is the right behaviour and the wrong reason to lose them.
//
// So the examples are asserted against the real records. If the seed changes again, this fails here
// rather than at a demo.

const ROOT = join(import.meta.dirname, "../..");
const ID_PATTERN = /\b(?:ZD|GONG|USG|OPP|CON)-[A-Za-z0-9-]+\b/g;

const SOURCES = [
  "agent/instructions.md",
  "agent/tools/read_account_activity.ts",
  "agent/tools/read_salesforce.ts",
  "agent/tools/emit_brief.ts",
  "lib/brief/schema.ts",
];

function everyRealId(): Set<string> {
  const ids = new Set<string>();
  for (const account of ALL_ACCOUNTS) {
    for (const t of account.tickets) ids.add(t.ticketId);
    for (const c of account.calls) ids.add(c.callId);
    for (const u of account.usage) ids.add(u.usageId);
    for (const o of account.salesforce.opportunities) ids.add(o.oppId);
    for (const c of account.salesforce.contacts) ids.add(c.contactId);
  }
  return ids;
}

describe("example citation ids in prompts", () => {
  const real = everyRealId();

  it.each(SOURCES)("every id named in %s resolves to a seeded record", (source) => {
    const text = readFileSync(join(ROOT, source), "utf8");
    const cited = [...new Set(text.match(ID_PATTERN) ?? [])];
    const unresolved = cited.filter((id) => !real.has(id));
    expect(unresolved, `${source} names ids that do not exist in the seed`).toEqual([]);
  });

  it("has records to check against", () => {
    // Guards the guard: if the seed failed to load, every source above would pass vacuously.
    expect(real.size).toBeGreaterThan(100);
  });
});
