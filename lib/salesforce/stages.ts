// The standard Salesforce opportunity path, in order.
//
// Kept as data next to the adapter rather than hardcoded in a component, because the sequence is the
// CRM's configuration and not a UI detail. A customer who renamed their stages changes this list and
// the tracker follows.
//
// An unrecognised stage is not an error. Every org customises this path, and a tracker that threw or
// silently rendered nothing on a stage it did not know would be worse than one that shows the stage as
// it stands with no position claimed for it.
export const STAGE_PATH = [
  "Qualification",
  "Discovery",
  "Technical Validation",
  "Proposal/Price Quote",
  "Negotiation/Review",
  "Closed Won",
] as const;

export function stagePosition(stage: string | null): number {
  return stage ? STAGE_PATH.indexOf(stage as (typeof STAGE_PATH)[number]) : -1;
}

export function isClosed(stage: string | null): boolean {
  return stage === "Closed Won" || stage === "Closed Lost";
}
