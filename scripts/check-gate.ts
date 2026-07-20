import assert from "node:assert";
import type { BriefInput } from "../lib/brief/schema";
import { enforceCitations } from "../lib/grounding/gate";

// Proves the grounding gate on the flagship Northwind case, with no model and no database in the loop.
// Two claims must be withheld: an unbacked competitor-selection inference (no citation) and a
// fabricated ticket id (ZD-4540 does not exist). Everything backed by a real id must ship.

const knownIds = new Set([
  "ZD-4471",
  "ZD-4488",
  "ZD-4519",
  "ZD-4527",
  "GONG-882",
  "GONG-911",
  "GONG-925",
  "USG-2208",
  "USG-2209",
]);

const brief: BriefInput = {
  account: "Northwind",
  summary: [
    { text: "Product usage fell from 238 to 96 weekly active seats against a contracted 250.", citations: ["USG-2208"] },
    { text: "Support load spiked to three P1 tickets with two breached SLAs.", citations: ["ZD-4471", "ZD-4488", "ZD-4519"] },
    { text: "The champion Dana Whitfield has left Northwind, confirmed on the July 15 call.", citations: ["GONG-925"] },
    // Unbacked inference: nothing supports a selection, so the model provides no citation. Must drop.
    { text: "Northwind has selected Databricks as its replacement platform.", citations: [] },
  ],
  nextSteps: [
    { priority: "high", text: "Deliver the overdue RCA and reliability plan within 48 hours.", owner: "SE + Support", citations: ["GONG-882", "ZD-4519"] },
    // Fabricated id: ZD-4540 does not exist in the account's activity. Must drop.
    { priority: "high", text: "Investigate the new data-loss P1 opened July 16.", owner: "Support", citations: ["ZD-4540"] },
  ],
  stageRead: {
    salesforceStage: "Negotiation/Review",
    groundedRead: "At Risk, not Commit",
    riskLevel: "high",
    confidence: 0.86,
    signals: [
      { text: "A roughly 60 percent usage decline over eight weeks.", citations: ["USG-2208", "USG-2209"] },
      { text: "An explicit no-commit from the inheriting stakeholder.", citations: ["GONG-911"] },
    ],
  },
};

const result = enforceCitations(brief, knownIds);

const droppedText = result.needsReview.map((d) => d.text);
assert.equal(result.needsReview.length, 2, "exactly two claims should be withheld");
assert.ok(
  droppedText.some((t) => t.includes("Databricks")),
  "the unbacked Databricks inference must be dropped",
);
assert.ok(
  droppedText.some((t) => t.includes("data-loss")),
  "the fabricated ZD-4540 claim must be dropped",
);
assert.ok(!result.summary.includes("Databricks"), "dropped text must not appear in the shipped summary");
assert.equal(result.nextSteps.length, 1, "only the backed next step ships");
assert.equal(result.stageRead.signals.length, 2, "both backed signals ship");
assert.equal(result.grounding.shippedClaims, 6, "six backed claims ship");
assert.equal(result.grounding.droppedClaims, 2);

console.log("grounding gate: PASS");
console.log(`  shipped ${result.grounding.shippedClaims} cited claims, withheld ${result.grounding.droppedClaims}:`);
for (const d of result.needsReview) {
  console.log(`    dropped: "${d.text}" (${d.reason})`);
}
