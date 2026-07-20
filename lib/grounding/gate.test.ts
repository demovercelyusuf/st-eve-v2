import { describe, expect, it } from "vitest";
import type { BriefInput } from "../brief/schema";
import { enforceCitations } from "./gate";

// The activity and Salesforce ids that exist for the account under test.
const KNOWN = new Set([
  "ZD-4471",
  "ZD-4488",
  "ZD-4519",
  "GONG-882",
  "GONG-911",
  "GONG-925",
  "USG-2208",
  "USG-2209",
  "OPP-2041-R",
  "CON-2041-1",
]);

const claim = (text: string, citations: string[]) => ({ text, citations });

function briefWith(overrides: Partial<BriefInput>): BriefInput {
  return {
    account: "Northwind",
    summary: [],
    nextSteps: [],
    stageRead: {
      salesforceStage: "Negotiation/Review",
      groundedRead: "At Risk",
      riskLevel: "high",
      confidence: 0.8,
      signals: [],
    },
    ...overrides,
  };
}

describe("the grounding gate", () => {
  it("ships a claim backed by a real activity id", () => {
    const result = enforceCitations(
      briefWith({ summary: [claim("Seats fell from 238 to 96.", ["USG-2208"])] }),
      KNOWN,
    );
    expect(result.needsReview).toHaveLength(0);
    expect(result.summary).toContain("Seats fell");
    expect(result.grounding.shippedClaims).toBe(1);
  });

  it("withholds a claim with no citation", () => {
    const result = enforceCitations(
      briefWith({ summary: [claim("Northwind has selected Databricks.", [])] }),
      KNOWN,
    );
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].reason).toMatch(/no citation/);
    expect(result.summary).not.toContain("Databricks");
  });

  it("withholds a claim citing a fabricated id", () => {
    const result = enforceCitations(
      briefWith({
        nextSteps: [
          { priority: "high", text: "Investigate the data-loss P1.", owner: "Support", citations: ["ZD-4540"] },
        ],
      }),
      KNOWN,
    );
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].reason).toMatch(/does not resolve/);
    expect(result.nextSteps).toHaveLength(0);
  });

  it("resolves Salesforce record ids, not just warehouse activity", () => {
    const result = enforceCitations(
      briefWith({ summary: [claim("The FY26 renewal is $480K.", ["OPP-2041-R"])] }),
      KNOWN,
    );
    expect(result.needsReview).toHaveLength(0);
    expect(result.summary).toContain("$480K");
  });

  it("keeps only the backed signals in the stage read", () => {
    const result = enforceCitations(
      briefWith({
        stageRead: {
          salesforceStage: "Negotiation/Review",
          groundedRead: "At Risk",
          riskLevel: "high",
          confidence: 0.86,
          signals: [claim("Usage is down about 60 percent.", ["USG-2208", "USG-2209"]), claim("A competitor was chosen.", [])],
        },
      }),
      KNOWN,
    );
    expect(result.stageRead.signals).toHaveLength(1);
    expect(result.stageRead.signals[0]).toContain("Usage is down");
  });

  it("handles the flagship Northwind case: six shipped, two withheld", () => {
    const result = enforceCitations(
      briefWith({
        summary: [
          claim("Seats fell from 238 to 96 against a contracted 250.", ["USG-2208"]),
          claim("Support spiked to three P1 tickets with two SLA breaches.", ["ZD-4471", "ZD-4488", "ZD-4519"]),
          claim("The champion has left Northwind.", ["GONG-925"]),
          claim("Northwind has selected Databricks as its replacement.", []),
        ],
        nextSteps: [
          { priority: "high", text: "Deliver the overdue RCA.", owner: "SE + Support", citations: ["GONG-882", "ZD-4519"] },
          { priority: "high", text: "Investigate the new data-loss P1.", owner: "Support", citations: ["ZD-4540"] },
        ],
        stageRead: {
          salesforceStage: "Negotiation/Review",
          groundedRead: "At Risk, not Commit",
          riskLevel: "high",
          confidence: 0.86,
          signals: [
            claim("A roughly 60 percent usage decline.", ["USG-2208", "USG-2209"]),
            claim("The inheriting stakeholder would not commit.", ["GONG-911"]),
          ],
        },
      }),
      KNOWN,
    );
    expect(result.grounding.shippedClaims).toBe(6);
    expect(result.grounding.droppedClaims).toBe(2);
    const dropped = result.needsReview.map((d) => d.text).join(" ");
    expect(dropped).toMatch(/Databricks/);
    expect(dropped).toMatch(/data-loss/);
  });
});
