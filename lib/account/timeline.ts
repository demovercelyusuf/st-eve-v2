import { readAccountIssues } from "../linear/account-issues";
import { getSalesforceAccount, type Opportunity } from "../salesforce/adapter";
import { getAccount, getAccountActivity, type AccountSummary } from "../warehouse/repository";

// One timeline out of three systems.
//
// The account page is the evidence surface: it is where an SE lands when a brief cites something and
// they want to see the record behind it. It only ever showed warehouse rows, which meant a brief could
// cite LIN-DEM-8 or CON-4471, the SE would click through, and the thing they came to read was not on
// the page. A third of the evidence was invisible on the surface built to show evidence.
//
// The merge lives here rather than in the page for two reasons. The page is a Cache Components shell
// and must stay free of data work, and more importantly the set of citable sources is already
// described once in lib/citations/registry.ts. A merge assembled inline in a component would be a
// second, silently divergent copy of "what Steve can cite", and the failure mode of that divergence is
// exactly the one the page has today: a source the gate accepts that the surface cannot show.

export type EvidenceSource = "warehouse" | "salesforce" | "linear";

// Record rows are the current state of a system (an open opportunity, a named contact). Activity rows
// are things that happened on a date. Both are citable and both need an anchor, but sorting a contact
// into a chronology means inventing a timestamp the CRM never gave us, and a close date is a forecast
// rather than an event. So the two groups are rendered as two bands of one list instead of being
// forced onto a single axis that would misdate half of them.
export type EvidenceGroup = "record" | "activity";

export type EvidenceRow = {
  // Doubles as the DOM id. This is the whole deep-link scheme: the id a brief cites is the id the row
  // carries, so /accounts/ACC-2041#GONG-902 needs no lookup table and no mapping to drift.
  citationId: string;
  source: EvidenceSource;
  group: EvidenceGroup;
  kind: string;
  // ISO date, or null where the source has no defensible one. Sorting only ever uses this field.
  at: string | null;
  atLabel: string;
  title: string;
  detail: string | null;
  // Only live sources carry one. A warehouse or CRM id resolves inside this app; a Linear id can be
  // clicked back to the record an engineer already works in.
  url: string | null;
  flags: string[];
};

// What was read and what was not. Rendered on the page as a coverage strip, because a timeline that
// silently omits a source is worse than one that says it could not reach it: the SE would read the
// absence of engineering issues as "there are none".
export type SourceStatus = {
  source: EvidenceSource;
  label: string;
  ok: boolean;
  count: number;
  note: string | null;
};

export type AccountEvidence = {
  account: AccountSummary;
  opportunity: Opportunity | null;
  rows: EvidenceRow[];
  sources: SourceStatus[];
  // Passed to the anchor handler so an unresolvable LIN- citation can say "Linear was not reachable"
  // rather than the misleading "no such record".
  linearConnected: boolean;
};

const PRIORITY_LABEL: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Medium", 4: "Low" };

function isoDay(value: string): string {
  return value.slice(0, 10);
}

// Newest first, and undated record rows ahead of everything. An SE opening an account wants the
// current state of the deal before the history of it, and a citation lands on its anchor regardless
// of where in the order the row sits.
function byRecency(a: EvidenceRow, b: EvidenceRow): number {
  if (a.at === b.at) return a.citationId.localeCompare(b.citationId);
  if (a.at === null) return -1;
  if (b.at === null) return 1;
  return b.at.localeCompare(a.at);
}

export async function getAccountEvidence(accountId: string): Promise<AccountEvidence | null> {
  // Identity first and on its own, because it decides between a page and a 404. Everything after it
  // is settled rather than awaited: one source failing must cost its own band of the timeline and
  // nothing else. Promise.all here would mean a Linear timeout blanking the warehouse history.
  const account = await getAccount(accountId);
  if (!account) return null;

  const [activityResult, sfdcResult, linearResult] = await Promise.allSettled([
    getAccountActivity(accountId),
    getSalesforceAccount(accountId),
    readAccountIssues(accountId),
  ]);

  const rows: EvidenceRow[] = [];
  const sources: SourceStatus[] = [];

  if (activityResult.status === "fulfilled") {
    for (const a of activityResult.value) {
      rows.push({
        citationId: a.activityId,
        source: "warehouse",
        group: "activity",
        kind: a.activityType === "call" ? "Call" : "Usage",
        at: a.occurredAt,
        atLabel: a.occurredAt,
        title: a.summary,
        detail: a.detail,
        url: null,
        flags: [],
      });
    }
    sources.push({
      source: "warehouse",
      label: "Warehouse",
      ok: true,
      count: activityResult.value.length,
      note: null,
    });
  } else {
    sources.push({
      source: "warehouse",
      label: "Warehouse",
      ok: false,
      count: 0,
      note: "Call notes and usage could not be read.",
    });
  }

  const sfdc = sfdcResult.status === "fulfilled" ? sfdcResult.value : null;
  if (sfdc) {
    for (const opp of sfdc.opportunities) {
      rows.push({
        citationId: opp.oppId,
        source: "salesforce",
        group: "record",
        kind: "Opportunity",
        // Deliberately undated. The only date on an opportunity is the close date, which is a
        // forecast, and placing it on a timeline would file the deal months into the future between
        // rows describing things that actually happened.
        at: null,
        atLabel: opp.closeDate ? `close ${opp.closeDate}` : "no close date",
        title: opp.name,
        detail: opp.nextStep ? `Next step: ${opp.nextStep}` : "No next step set",
        url: null,
        flags: [opp.stage, opp.riskFlag].filter((f): f is string => Boolean(f)),
      });
    }
    for (const contact of sfdc.contacts) {
      rows.push({
        citationId: contact.contactId,
        source: "salesforce",
        group: "record",
        kind: "Contact",
        at: null,
        atLabel: "current record",
        title: contact.name,
        detail: contact.title,
        url: null,
        // A departed champion is the single most load-bearing fact on a contact record and the thing
        // a brief most often cites, so it travels as a flag rather than buried in the detail line.
        flags: [
          contact.role ? contact.role.replace(/_/g, " ") : null,
          contact.active ? null : "departed",
        ].filter((f): f is string => Boolean(f)),
      });
    }
    sources.push({
      source: "salesforce",
      label: "Salesforce",
      ok: true,
      count: sfdc.opportunities.length + sfdc.contacts.length,
      note: null,
    });
  } else {
    sources.push({
      source: "salesforce",
      label: "Salesforce",
      ok: false,
      count: 0,
      note:
        sfdcResult.status === "rejected"
          ? "The CRM did not respond, so the opportunity and contacts are missing."
          : "No CRM record is linked to this account.",
    });
  }

  const linear = linearResult.status === "fulfilled" ? linearResult.value : null;
  const linearConnected = linear?.connected === true;
  if (linear?.connected) {
    for (const issue of linear.issues) {
      rows.push({
        // Namespaced by the same helper the tool cites with, so the id on the page and the id in the
        // brief are produced by one function. Building "LIN-" + identifier here instead would be a
        // second spelling of the citation scheme.
        citationId: `LIN-${issue.identifier}`,
        source: "linear",
        group: "activity",
        kind: "Issue",
        at: isoDay(issue.updatedAt),
        atLabel: `updated ${isoDay(issue.updatedAt)}`,
        title: issue.title,
        detail: issue.description ? issue.description.split("\n")[0] : null,
        url: issue.url,
        flags: [issue.state, PRIORITY_LABEL[issue.priority]].filter((f): f is string => Boolean(f)),
      });
    }
    sources.push({
      source: "linear",
      label: "Linear",
      ok: true,
      count: linear.issues.length,
      note: linear.issues.length === 0 ? "No issues carry this account's label." : null,
    });
  } else {
    sources.push({
      source: "linear",
      label: "Linear",
      ok: false,
      count: 0,
      note: linear?.connected === false ? linear.reason : "Linear could not be read.",
    });
  }

  return {
    account,
    opportunity: sfdc?.opportunities[0] ?? null,
    rows: rows.sort(byRecency),
    sources,
    linearConnected,
  };
}
