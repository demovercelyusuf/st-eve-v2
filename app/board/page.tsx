import { Suspense } from "react";
import { Nav } from "@/app/_components/nav";
import { StageBoard, type StageCard } from "@/app/_components/stage-board";
import { getPatchOverview } from "@/lib/dashboard/patch";

export const metadata = { title: "Stages" };

// The stage board: opportunities grouped by their Salesforce stage, in pipeline order. The copilot's
// grounded read can disagree with the labeled stage (an account can sit in Negotiation while every
// signal says it is slipping), and the dashboard flags that with the risk badge.
//
// Static shell, streamed columns, same as the patch view. The stage query crosses into RDS and then
// into Linear, so the chrome and the explanation of what the board does arrive without waiting on
// either. The interactive board is a client island below the boundary rather than the page itself,
// which is what keeps this file free of data reads and the route prerenderable.
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

// Sized to the real thing, including the scenario bar, so the shell does not reflow when the data
// lands under it.
function BoardSkeleton() {
  return (
    <div className="mt-6">
      <div className="h-[38px] animate-pulse rounded-lg border border-border bg-card" />
      <div className="mt-4 flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            className="h-72 w-72 shrink-0 animate-pulse rounded-xl border border-border bg-card"
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

async function StageColumns() {
  const { rows, engineering } = await getPatchOverview();

  // Only accounts with an opportunity have a stage, so only they belong on a board organised by
  // stage. The rest are counted underneath rather than dropped in silently: an account missing from
  // a view is a question, and answering it in a line of text is cheaper than inventing a column for
  // a state that is not a stage.
  const cards: StageCard[] = rows
    .filter((r) => r.stage !== null)
    .map((r) => ({
      accountId: r.accountId,
      name: r.name,
      stage: r.stage as string,
      amount: r.amount,
      closeDate: r.closeDate,
      nextStep: r.nextStep,
      riskFlag: r.riskFlag,
      openIssues: r.openIssues,
    }));

  const withoutOpportunity = rows.length - cards.length;

  return (
    <>
      <StageBoard cards={cards} engineeringConnected={engineering.connected} />

      <p className="mt-3 text-muted-foreground text-xs">
        {withoutOpportunity > 0
          ? `${withoutOpportunity} ${withoutOpportunity === 1 ? "account has" : "accounts have"} no opportunity and are not on the board. `
          : ""}
        {engineering.connected
          ? null
          : "Linear was not consulted, so engineering load is not shown on these cards."}
      </p>
    </>
  );
}
