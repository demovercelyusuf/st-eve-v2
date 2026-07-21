import { cardToBlocks } from "eve/channels/slack";
import { describe, expect, it } from "vitest";
import { type BriefCardInput, briefCard, briefFallbackText, groundingFooter } from "./brief-card";

// Rendered through eve's real cardToBlocks rather than asserted against the card object, because the
// failures that matter here happen at conversion: Slack rejects a message over 50 blocks or a section
// over 3,000 characters with invalid_blocks, and the SE is left watching a thread that never resolves
// after the agent said it was writing a brief.
//
// The undefined-title case below is not hypothetical. emit_brief returned accountId but not the
// resolved name, so the first real render produced "Weekly brief: undefined". It only showed up
// because a genuine brief was rendered instead of a fixture someone wrote by hand.

const base: BriefCardInput = {
  account: "Northwind Trading Co.",
  accountId: "ACC-2041",
  summary: "The expansion is gated on two failing exit criteria.",
  nextSteps: [
    {
      priority: "high",
      text: "Give Northwind a build date for the CDC failover fix.",
      owner: "SE + Engineering",
      citations: ["LIN-DEM-8"],
    },
  ],
  stageRead: {
    salesforceStage: "Proposal/Price Quote",
    groundedRead: "Stalled behind technical blockers, not a negotiation.",
    riskLevel: "high",
    confidence: 0.72,
    signals: ["A failover drill lost 41,900 rows."],
  },
  needsReview: [],
  citedIds: ["LIN-DEM-8"],
  grounding: { shippedClaims: 1, citedClaims: 1, droppedClaims: 0 },
};

function blocksOf(input: BriefCardInput) {
  return cardToBlocks(briefCard(input)) as Array<Record<string, unknown>>;
}

describe("brief card", () => {
  it("renders inside Slack's limits", () => {
    const blocks = blocksOf(base);
    expect(blocks.length).toBeLessThanOrEqual(50);
    for (const block of blocks) {
      expect(JSON.stringify(block).length).toBeLessThanOrEqual(3000);
    }
  });

  it("names the account in the title", () => {
    expect(JSON.stringify(blocksOf(base))).toContain("Northwind Trading Co.");
    expect(JSON.stringify(blocksOf(base))).not.toContain("undefined");
  });

  it("stays within limits when every field is oversized", () => {
    // A verbose account is the realistic way to hit invalid_blocks, and the withheld claims are last
    // on the card, so an unbounded brief above them is what would push them off the end.
    const long = "x".repeat(6000);
    const blocks = blocksOf({
      ...base,
      summary: long,
      nextSteps: Array.from({ length: 40 }, () => base.nextSteps[0]),
      stageRead: { ...base.stageRead, signals: Array.from({ length: 40 }, () => long) },
      needsReview: Array.from({ length: 40 }, () => ({ text: long, reason: long })),
    });
    expect(blocks.length).toBeLessThanOrEqual(50);
    for (const block of blocks) {
      expect(JSON.stringify(block).length).toBeLessThanOrEqual(3000);
    }
  });

  it("shows what the gate withheld", () => {
    const rendered = JSON.stringify(
      blocksOf({
        ...base,
        needsReview: [{ text: "They are evaluating Competitor X.", reason: "no citation" }],
        grounding: { shippedClaims: 1, citedClaims: 1, droppedClaims: 1 },
      }),
    );
    expect(rendered).toContain("Withheld by the grounding gate");
    expect(rendered).toContain("Competitor X");
  });

  it("links a citation only when the ledger gave it a url", () => {
    const rendered = JSON.stringify(
      blocksOf({
        ...base,
        nextSteps: [{ ...base.nextSteps[0], citations: ["LIN-VAN-412", "GONG-902"] }],
        sources: [{ citationId: "LIN-VAN-412", url: "https://linear.app/x/issue/VAN-412" }],
      }),
    );
    // Live sources become clickable; warehouse ids stay plain chips.
    expect(rendered).toContain("linear.app");
    expect(rendered).toContain("GONG-902");
  });

  it("escapes mrkdwn control characters from customer text", () => {
    const rendered = JSON.stringify(
      blocksOf({ ...base, summary: "Latency <2s & rising >p99" }),
    );
    expect(rendered).toContain("&lt;");
    expect(rendered).toContain("&amp;");
  });

  it("says plainly when nothing was withheld", () => {
    expect(groundingFooter(base)).toContain("nothing withheld");
    expect(groundingFooter({ ...base, grounding: { shippedClaims: 5, citedClaims: 5, droppedClaims: 2 } })).toContain(
      "2 withheld",
    );
  });

  it("has fallback text for notifications, where blocks are not rendered", () => {
    expect(briefFallbackText(base)).toContain("Northwind Trading Co.");
    expect(briefFallbackText(base)).not.toContain("undefined");
  });
});
