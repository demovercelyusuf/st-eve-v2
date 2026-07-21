import { and, eq } from "drizzle-orm";
import { appStore, schema } from "../appstore/client";

// The record of what Steve read from a live system during one run, and therefore what it is allowed
// to cite from that system.
//
// A read tool writes here, the gate reads from here. That indirection is what lets a Linear issue be
// citable at all: it has no row in the warehouse for the gate to check against, so "did we actually
// read this" becomes the check instead.
//
// The source column is deliberately not an enum. Linear is the only live source today, and the shape
// of this table is what a second one would slot into rather than a schema change.

export type EvidenceRef = {
  citationId: string;
  source: "linear";
  label: string;
  url: string | null;
};

// Recorded by the tool that fetched the records, before the model ever sees them. Conflicts are
// ignored rather than updated: within one session an id refers to one thing, and a re-read returning
// the same id should not quietly change what a citation already made means.
export async function recordEvidence(
  sessionId: string,
  accountId: string,
  refs: readonly EvidenceRef[],
): Promise<void> {
  if (refs.length === 0) return;
  await appStore()
    .insert(schema.evidence)
    .values(
      refs.map((r) => ({
        sessionId,
        accountId,
        citationId: r.citationId,
        source: r.source,
        label: r.label,
        url: r.url,
      })),
    )
    .onConflictDoNothing();
}

// What this session may cite for this account, from live sources. Returned as a map rather than a Set
// because the renderer needs the label and url to turn a citation into something clickable, and doing
// it here avoids a second read at render time.
export async function readEvidence(
  sessionId: string,
  accountId: string,
): Promise<Map<string, EvidenceRef>> {
  const rows = await appStore()
    .select()
    .from(schema.evidence)
    .where(and(eq(schema.evidence.sessionId, sessionId), eq(schema.evidence.accountId, accountId)));

  return new Map(
    rows.map((r) => [
      r.citationId,
      {
        citationId: r.citationId,
        source: r.source as EvidenceRef["source"],
        label: r.label,
        url: r.url,
      },
    ]),
  );
}
