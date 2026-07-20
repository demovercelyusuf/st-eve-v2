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

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) {
    return <span className="text-muted-foreground text-xs">No opportunity</span>;
  }
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs">{stage}</span>
  );
}
