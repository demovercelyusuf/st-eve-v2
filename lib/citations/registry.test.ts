import { describe, expect, it } from "vitest";
import { BriefInput } from "../brief/schema";
import { enforceCitations } from "../grounding/gate";
import { CITATION_SOURCES, describeUnresolved, sourceFor } from "./registry";

describe("citation registry", () => {
  it("attributes an id to its source", () => {
    expect(sourceFor("ZD-4471")?.kind).toBe("ticket");
    expect(sourceFor("GONG-902")?.kind).toBe("call");
    expect(sourceFor("LIN-VAN-412")?.kind).toBe("linear");
    expect(sourceFor("OPP-2041-P")?.kind).toBe("opportunity");
  });

  it("refuses to attribute something that is not a citation id", () => {
    expect(sourceFor("the June call")).toBeNull();
    expect(sourceFor("")).toBeNull();
  });

  it("uses distinct prefixes, so an id can only mean one thing", () => {
    // A shared or overlapping prefix would let an id resolve against the wrong source, and the gate
    // could not detect it: the id would be in the set, just for the wrong reason.
    for (const a of CITATION_SOURCES) {
      const overlapping = CITATION_SOURCES.filter(
        (b) => b !== a && (b.prefix.startsWith(a.prefix) || a.prefix.startsWith(b.prefix)),
      );
      expect(overlapping, `${a.prefix} overlaps another prefix`).toEqual([]);
    }
  });

  it("explains an unresolved id in terms a human can act on", () => {
    const explained = describeUnresolved(["LIN-VAN-999"]);
    expect(explained).toContain("LIN-VAN-999");
    expect(explained).toContain("Linear");
    // The point is that it names what went wrong, not that it restates the id.
    expect(explained.length).toBeGreaterThan("LIN-VAN-999".length + 10);
  });

  it("says so plainly when the model invents an id shape", () => {
    expect(describeUnresolved(["ACME-1"])).toContain("not an id Steve can cite");
  });
});

describe("the gate, wired to the registry", () => {
  const brief: BriefInput = {
    account: "Northwind",
    summary: [
      { text: "The failover drill lost rows.", citations: ["ZD-4462"] },
      { text: "They are evaluating a competitor.", citations: ["LIN-VAN-999"] },
    ],
    nextSteps: [],
    stageRead: {
      salesforceStage: "Proposal/Price Quote",
      groundedRead: "stalled on exit criteria",
      riskLevel: "high",
      confidence: 0.7,
      signals: [],
    },
  };

  it("drops the unbacked claim and explains why in the registry's words", () => {
    const result = enforceCitations(brief, new Set(["ZD-4462"]), describeUnresolved);
    expect(result.grounding.shippedClaims).toBe(1);
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].reason).toContain("Linear");
    expect(result.summary).toBe("The failover drill lost rows.");
  });

  it("reports the ids that survived", () => {
    const result = enforceCitations(brief, new Set(["ZD-4462"]), describeUnresolved);
    expect(result.citedIds).toEqual(["ZD-4462"]);
  });

  it("still works without the registry", () => {
    // The default keeps the gate usable on its own, which is what makes it portable.
    const result = enforceCitations(brief, new Set(["ZD-4462"]));
    expect(result.needsReview[0].reason).toContain("LIN-VAN-999");
  });
});
