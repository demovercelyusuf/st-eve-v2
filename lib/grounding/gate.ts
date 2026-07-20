import type { BriefInput, DroppedClaim, ShippedBrief } from "../brief/schema";

// The grounding gate. A claim ships only if it carries at least one citation and every citation
// resolves to a real activity id for this account. Everything else is dropped from the shipped brief
// and surfaced under needs-review with the reason it was withheld.
//
// This runs in code, after generation, so a confident but unbacked claim (an inferred competitor
// selection with nothing behind it) and a hallucinated citation (a fabricated ticket id) are both
// caught and held back rather than shipped silently. That is the exact failure mode that sank the
// prior in-house attempt. This function is deliberately framework-agnostic: no eve, no AI SDK, no
// database. It is pure, so it is trivial to test and portable to any runtime.

export function enforceCitations(
  brief: BriefInput,
  knownIds: Set<string>,
  // How to describe an id that did not resolve. Injected so the gate stays framework-free and knows
  // nothing about which sources exist; lib/citations/registry.ts owns that. The gate owns exactly one
  // question, whether an id is in the set, and the default keeps it usable without the registry.
  explain: (ids: readonly string[]) => string = (ids) => ids.join(", "),
): Omit<ShippedBrief, "account" | "accountId"> {
  const dropped: DroppedClaim[] = [];
  // The ids that actually shipped, first seen first. Collected here rather than recomputed by callers
  // because "cited" has one definition and this is where it lives. The Slack renderer needs them to
  // build a source list without a second read, and the account page needs them to show what the brief
  // rested on.
  const citedIds: string[] = [];

  function backed(text: string, citations: string[]): boolean {
    if (citations.length === 0) {
      dropped.push({ text, reason: "no citation to a real source" });
      return false;
    }
    const unresolved = citations.filter((id) => !knownIds.has(id));
    if (unresolved.length > 0) {
      dropped.push({ text, reason: `citation does not resolve. ${explain(unresolved)}` });
      return false;
    }
    for (const id of citations) if (!citedIds.includes(id)) citedIds.push(id);
    return true;
  }

  const summaryClaims = brief.summary.filter((c) => backed(c.text, c.citations));
  const nextSteps = brief.nextSteps.filter((s) => backed(s.text, s.citations));
  const signals = brief.stageRead.signals.filter((s) => backed(s.text, s.citations));

  const shippedClaims = summaryClaims.length + nextSteps.length + signals.length;

  return {
    summary: summaryClaims.map((c) => c.text).join(" "),
    nextSteps,
    stageRead: {
      salesforceStage: brief.stageRead.salesforceStage,
      groundedRead: brief.stageRead.groundedRead,
      riskLevel: brief.stageRead.riskLevel,
      confidence: brief.stageRead.confidence,
      signals: signals.map((s) => s.text),
    },
    needsReview: dropped,
    citedIds,
    // Every claim that ships is cited, so shipped and cited are equal by construction. dropped is the
    // count the gate caught and withheld.
    grounding: { shippedClaims, citedClaims: shippedClaims, droppedClaims: dropped.length },
  };
}
