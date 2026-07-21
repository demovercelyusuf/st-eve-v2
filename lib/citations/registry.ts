// Every kind of thing Steve is allowed to cite, in one list.
//
// This exists because of a specific failure mode. The known-id set is assembled by hand in
// emit_brief, and a source added without extending that assembly does not error: the model reads the
// data, cites it correctly, and the gate silently drops every claim into needs-review because the ids
// are not in the set. The brief still ships, just thinner, and nothing anywhere says why. A registry
// does not make that impossible, it makes it loud, which is the part that was missing.
//
// It also carries the sentence a human reads when a citation fails. "citation does not resolve" tells
// an SE nothing; "that is a Linear id and no issue with that identifier was read for this account"
// tells them whether the model invented an issue or the account is missing its label.

export type CitationOrigin = "warehouse" | "salesforce" | "live";

export type CitationSource = {
  readonly kind: string;
  readonly prefix: string;
  /**
   * Warehouse ids are citable because a row exists in activity.fct_account_activity, which the gate
   * already reads. Salesforce ids are citable because the adapter returned the record. Live ids are
   * citable because a read tool recorded them in the evidence ledger during this run, for this
   * account. Nothing else confers citability.
   */
  readonly origin: CitationOrigin;
  /** Written into needsReview when a citation carrying this prefix does not resolve. */
  readonly whenMissing: string;
};

export const CITATION_SOURCES: readonly CitationSource[] = [
  {
    kind: "ticket",
    prefix: "ZD-",
    origin: "warehouse",
    whenMissing: "no support ticket with that id exists for this account",
  },
  {
    kind: "call",
    prefix: "GONG-",
    origin: "warehouse",
    whenMissing: "no call with that id exists for this account",
  },
  {
    kind: "usage",
    prefix: "USG-",
    origin: "warehouse",
    whenMissing: "no usage series with that id exists for this account",
  },
  {
    kind: "opportunity",
    prefix: "OPP-",
    origin: "salesforce",
    whenMissing: "that opportunity is not on this account's Salesforce record",
  },
  {
    kind: "contact",
    prefix: "CON-",
    origin: "salesforce",
    whenMissing: "that contact is not on this account's Salesforce record",
  },
  {
    kind: "linear",
    prefix: "LIN-",
    origin: "live",
    whenMissing:
      "no Linear issue with that identifier was read for this account in this run, so either it does not exist or the account is missing its Linear label",
  },
];

export function sourceFor(citationId: string): CitationSource | null {
  return CITATION_SOURCES.find((s) => citationId.startsWith(s.prefix)) ?? null;
}

// Turns a list of unresolved ids into something an SE can act on. A dropped claim is the copilot's
// most useful output when the model is wrong, so the reason it was dropped has to be worth reading.
export function describeUnresolved(ids: readonly string[]): string {
  return ids
    .map((id) => {
      const source = sourceFor(id);
      return source ? `${id}: ${source.whenMissing}` : `${id}: not an id Steve can cite`;
    })
    .join("; ");
}
