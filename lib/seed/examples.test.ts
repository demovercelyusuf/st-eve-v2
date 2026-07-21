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
// ZD is deliberately absent. Support tickets moved to Linear, so no ZD- id resolves to anything, and
// leaving the prefix in this pattern is what let the guard pass while a transcript cited one: it
// scanned for ZD- ids, found the seed still carried them, and confirmed they were valid. A pattern
// that recognises a retired namespace validates it.
// LIN is deliberately absent too, for a different reason than ZD. Linear assigns issue identifiers
// when the issue is created, so a LIN- id exists in Linear and never in the seed. This guard resolves
// against seeded records, so it cannot verify one, and pretending otherwise would make it fail on a
// correct example. Linear citations are verified at runtime instead: read_linear_issues records what
// it returned in the evidence ledger, and the gate resolves against that.
const ID_PATTERN = /\b(?:GONG|USG|OPP|CON)-[A-Za-z0-9-]+\b/g;

// Prefixes nothing may cite, because nothing mints them any more.
const RETIRED_PREFIXES = ["ZD-"];

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
    // account.tickets is the input scripts/seed-linear.ts creates issues from. Those issues are
    // citable under their own LIN- identifiers, assigned by Linear at seed time, so a ticket id is
    // not a citable record and must not be added here.
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
    // Guards the guard: if the seed failed to load, every source above would pass vacuously. The
    // floor is well under the real count (currently 98 across calls, usage, opportunities and
    // contacts) so it catches an empty load without breaking every time an account is edited.
    expect(real.size).toBeGreaterThan(60);
  });
});

// The prompts are not the only place an id can be cited. A call transcript naming a record is read by
// the model as evidence, so a transcript citing a retired id teaches it to cite one back. The earlier
// version of this file checked the prompts alone and stayed green while two transcripts cited a
// system that no longer exists.
describe("citation ids in the seed itself", () => {
  const real = everyRealId();

  it("no seeded prose cites a retired namespace", () => {
    const offenders: string[] = [];
    for (const account of ALL_ACCOUNTS) {
      const prose = [
        account.situation,
        ...account.calls.flatMap((c) => [c.transcript, c.title, c.committedNextStep ?? ""]),
        ...account.tickets.map((t) => t.body),
        ...account.usage.map((u) => u.summary),
        ...account.salesforce.opportunities.map((o) => o.nextStep ?? ""),
      ].join(" ");
      for (const prefix of RETIRED_PREFIXES) {
        if (prose.includes(prefix)) offenders.push(`${account.accountId} cites ${prefix}`);
      }
    }
    expect(offenders, "seeded prose cites ids that resolve to nothing").toEqual([]);
  });

  it("every id a transcript cites is a real record", () => {
    const offenders: string[] = [];
    for (const account of ALL_ACCOUNTS) {
      for (const call of account.calls) {
        for (const id of call.transcript.match(ID_PATTERN) ?? []) {
          if (!real.has(id)) offenders.push(`${call.callId} cites ${id}`);
        }
      }
    }
    expect(offenders, "a transcript cites an id with no matching record").toEqual([]);
  });
});
