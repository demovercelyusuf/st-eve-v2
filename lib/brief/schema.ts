import { z } from "zod";

// The weekly brief, expressed so the grounding gate can enforce it. Prose is broken into discrete
// cited claims: a claim is a single factual statement plus the activity ids that back it. Structuring
// it this way is what lets the gate drop an unbacked claim entirely, text and all, rather than only
// stripping a dangling citation and leaving the false sentence in place.

export const CitedClaim = z.object({
  text: z.string().min(1).describe("one factual sentence for the brief"),
  citations: z
    .array(z.string())
    .describe("activity ids that back this exact sentence, for example ['ZD-4471','GONG-882']"),
});

export const NextStep = z.object({
  priority: z.enum(["high", "medium", "low"]),
  text: z.string().min(1),
  owner: z.string().describe("who owns this action, for example 'SE + Support'"),
  citations: z.array(z.string()),
});

export const StageRead = z.object({
  salesforceStage: z.string().describe("the current Salesforce stage, read from the CRM"),
  groundedRead: z.string().describe("the copilot's read of where the deal really stands"),
  riskLevel: z.enum(["high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  signals: z.array(CitedClaim).describe("the convergent signals behind the read, each one cited"),
});

// What the model hands emit_brief. It never writes the final prose directly; it provides these claims
// and the gate assembles the shipped brief from the ones that survive.
export const BriefInput = z.object({
  account: z.string().min(1).describe("account name or id the brief is for"),
  summary: z.array(CitedClaim).describe("the Salesforce-ready summary, as discrete cited claims"),
  nextSteps: z.array(NextStep),
  stageRead: StageRead,
});

export type CitedClaim = z.infer<typeof CitedClaim>;
export type NextStep = z.infer<typeof NextStep>;
export type StageRead = z.infer<typeof StageRead>;
export type BriefInput = z.infer<typeof BriefInput>;

export type DroppedClaim = { text: string; reason: string };

export type ShippedBrief = {
  account: string;
  accountId: string;
  summary: string;
  nextSteps: NextStep[];
  stageRead: {
    salesforceStage: string;
    groundedRead: string;
    riskLevel: "high" | "medium" | "low";
    confidence: number;
    signals: string[];
  };
  needsReview: DroppedClaim[];
  grounding: { shippedClaims: number; citedClaims: number; droppedClaims: number };
};
