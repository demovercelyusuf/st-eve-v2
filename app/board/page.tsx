import Link from "next/link";
import { Suspense } from "react";
import { RiskBadge } from "@/app/_components/badges";
import { Nav } from "@/app/_components/nav";
import { getPatchOverview, type PatchRow } from "@/lib/dashboard/patch";
import { fmtArr } from "@/lib/format";

export const metadata = { title: "Stages" };

// The stage board: opportunities grouped by their Salesforce stage, in pipeline order. The copilot's
// grounded read can disagree with the labeled stage (an account can sit in Negotiation while every
// signal says it is slipping); the dashboard flags that with the risk badge.
const STAGE_ORDER = [
  "Discovery",
  "Qualification",
  "Proposal/Price Quote",
  "Negotiation/Review",
  "Closed Won",
  "Closed Lost",
];

// Static shell, streamed columns. Same reasoning as the patch view: the stage query crosses into RDS,
// so the chrome and the explanation of what the risk badges mean arrive without waiting on it.
export default function BoardPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav active="board" />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-semibold text-2xl tracking-tight">Stage board</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Opportunities by Salesforce stage. Risk badges are the copilot's grounded read, which can
          differ from the labeled stage.
        </p>

        <Suspense fallback={<BoardSkeleton />}>
          <StageColumns />
        </Suspense>
      </div>
    </main>
  );
}

function BoardSkeleton() {
  return (
    <div className="mt-6 flex gap-4 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div className="h-64 w-72 shrink-0 animate-pulse rounded-lg border border-border bg-card" key={i} />
      ))}
    </div>
  );
}

async function StageColumns() {
  const patch = await getPatchOverview();
  const columns = new Map<string, PatchRow[]>();
  for (const stage of STAGE_ORDER) columns.set(stage, []);
  for (const p of patch) {
    const stage = p.stage && columns.has(p.stage) ? p.stage : p.stage ? p.stage : null;
    if (stage) {
      if (!columns.has(stage)) columns.set(stage, []);
      columns.get(stage)?.push(p);
    }
  }
  const stages = [...columns.entries()].filter(([, rows]) => rows.length > 0);

  return (
    <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-max gap-4 pb-2">
            {stages.map(([stage, rows]) => (
              <div className="w-72 shrink-0" key={stage}>
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="font-medium text-sm">{stage}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{rows.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {rows.map((p) => (
                    <Link
                      key={p.accountId}
                      href={`/accounts/${p.accountId}`}
                      className="rounded-lg border border-border bg-card p-3 transition hover:border-foreground/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-medium text-sm">{p.name}</span>
                        <RiskBadge risk={p.riskFlag} />
                      </div>
                      <div className="mt-1 text-muted-foreground text-xs">
                        {p.amount ? fmtArr(p.amount) : fmtArr(p.arr)}
                        {p.closeDate ? ` · close ${p.closeDate}` : ""}
                      </div>
                      {!p.nextStep && !STAGE_ORDER.slice(4).includes(stage) ? (
                        <div className="mt-1 text-amber-700 text-xs dark:text-amber-400">
                          Awaiting next step
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
