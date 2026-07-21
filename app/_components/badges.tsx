export function RiskBadge({ risk }: { risk: string | null }) {
  if (risk === "At Risk") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-400">
        At risk
      </span>
    );
  }
  if (risk === "Commit") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-400">
        Commit
      </span>
    );
  }
  return null;
}

// Salesforce stage names are built for a desktop CRM, and "Proposal/Price Quote" wrapping to two
// lines inside a pill is what they do in a phone-width column. The short form is shown below sm and
// the full name above it, so nothing is lost on the surface that has room for it.
const SHORT_STAGE: Record<string, string> = {
  "Closed Lost": "Lost",
  "Closed Won": "Won",
  "Needs Analysis": "Analysis",
  "Negotiation/Review": "Negotiation",
  "Perception Analysis": "Perception",
  "Proposal/Price Quote": "Proposal",
  "Value Proposition": "Value prop",
};

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) {
    return <span className="text-muted-foreground text-xs">No opportunity</span>;
  }
  const short = SHORT_STAGE[stage] ?? stage;
  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs">
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{stage}</span>
    </span>
  );
}
