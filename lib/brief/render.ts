// The brief as a renderer sees it, and the sentences both renderers agree on.
//
// Two surfaces show the same brief: a Block Kit card in the deal channel and a React component on the
// web. Neither is a subset of the other, so the thing to share is not markup, it is the shape and the
// handful of sentences that must read identically wherever an SE meets them. A grounding footer that
// says "nothing withheld" in Slack and something subtly different in the app would undermine the one
// claim this product makes.
//
// Deliberately free of eve, React and Slack. lib/slack/brief-card.ts turns this into blocks and
// app/_components/brief-card.tsx turns it into elements.

export type BriefSource = {
  citationId: string;
  url?: string | null;
  label?: string;
};

export type RenderableBrief = {
  account: string;
  accountId: string;
  summary: string;
  nextSteps: Array<{ priority: string; text: string; owner: string; citations: string[] }>;
  stageRead: {
    salesforceStage: string;
    groundedRead: string;
    riskLevel: string;
    confidence: number;
    signals: string[];
  };
  needsReview: Array<{ text: string; reason: string }>;
  citedIds: string[];
  grounding: { shippedClaims: number; citedClaims: number; droppedClaims: number };
  sources?: BriefSource[];
};

export const PRIORITY_LABEL: Record<string, string> = { high: "HIGH", medium: "MED", low: "LOW" };

// The one line that states what the gate did. Said the same way on both surfaces on purpose: this is
// the product's central claim, and two phrasings of it would read as two different guarantees.
export function groundingFooter(brief: RenderableBrief): string {
  const { citedClaims, droppedClaims } = brief.grounding;
  const sources = brief.citedIds.length;
  const withheld = droppedClaims === 0 ? "nothing withheld" : `${droppedClaims} withheld`;
  // "record" was already pluralised and "claims" was not, which only shows up on a one-claim brief
  // and looks careless on the exact line the product is asking to be trusted on.
  return `${citedClaims} ${citedClaims === 1 ? "claim" : "claims"}, every one cited to ${sources} ${sources === 1 ? "record" : "records"}, ${withheld}.`;
}

// What a Slack client shows in a notification, and what a page title can fall back to.
export function briefFallbackText(brief: RenderableBrief): string {
  return `Weekly brief: ${brief.account} (${brief.accountId}). ${brief.grounding.citedClaims} cited claims, ${brief.grounding.droppedClaims} withheld.`;
}

// Where a citation points. A live source recorded a url in the evidence ledger, so it can be clicked
// back to the record it came from; a warehouse or CRM id resolves inside this app instead. That
// difference is information rather than inconsistency, and both renderers show it.
export function sourceUrl(id: string, sources?: BriefSource[]): string | null {
  return sources?.find((s) => s.citationId === id)?.url ?? null;
}
