import { Suspense } from "react";
import { PatchTable, type PatchTableRow } from "@/app/_components/patch-table";
import { getCaller } from "@/lib/auth/server";
import { getPatchOverview } from "@/lib/dashboard/patch";
import { fmtArr } from "@/lib/format";
import { isClosed } from "@/lib/salesforce/stages";

export const metadata = { title: "Your patch" };

// The page itself is the static shell: chrome, heading, and the shape of what is coming. Everything
// that needs the warehouse sits below a Suspense boundary and streams in.
//
// This matters more here than on a typical dashboard because the read crosses a boundary. The patch
// query goes to RDS in us-east-1 over a Vault-minted credential, and that round trip is the page's
// whole latency budget. Shipping the shell first is the difference between a blank page and a usable
// one while it happens.
export default function DashboardPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Your patch</h1>
          <Suspense
            fallback={<p className="mt-1 text-muted-foreground text-sm">Reading the warehouse...</p>}
          >
            <PatchSubtitle />
          </Suspense>
        </div>

        <Suspense fallback={<PatchSkeleton />}>
          <PatchBody />
        </Suspense>
      </div>
    </div>
  );
}

async function PatchSubtitle() {
  const [{ rows }, caller] = await Promise.all([getPatchOverview(), getCaller()]);
  return (
    <p className="mt-1 text-muted-foreground text-sm">
      {rows.length} accounts, owned by {caller?.name ?? "you"}. Ask the copilot for a brief on any of
      them.
    </p>
  );
}

// Sized to the real thing rather than a spinner, so the shell does not reflow when the data lands.
function PatchSkeleton() {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="h-[76px] animate-pulse rounded-xl border border-border bg-card" key={i} />
        ))}
      </div>
      <div className="mt-6 h-9 animate-pulse rounded-md border border-border bg-card" />
      <div className="mt-3 h-96 animate-pulse rounded-xl border border-border bg-card" />
    </>
  );
}

function Kpi({ label, tone, value }: { label: string; tone?: "risk"; value: string }) {
  const valueClass = tone === "risk" ? "text-amber-700 dark:text-amber-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-semibold text-2xl tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

async function PatchBody() {
  const { engineering, rows } = await getPatchOverview();
  const atRisk = rows.filter((p) => p.riskFlag === "At Risk").length;
  const awaiting = rows.filter((p) => !p.nextStep && p.stage && !isClosed(p.stage)).length;
  const wins = rows.filter((p) => p.stage === "Closed Won").length;
  const book = rows.reduce((sum, p) => sum + (p.arr || 0), 0);

  // Only the fields the table renders cross to the client. The read model carries the Slack channel
  // and the opportunity ids too, and shipping those into a client component would put them in the
  // RSC payload for no reason anyone could point at later.
  const tableRows: PatchTableRow[] = rows.map((p) => ({
    accountId: p.accountId,
    name: p.name,
    industry: p.industry,
    segment: p.segment,
    arr: p.arr,
    stage: p.stage,
    amount: p.amount,
    closeDate: p.closeDate,
    nextStep: p.nextStep,
    riskFlag: p.riskFlag,
    activityCount: p.activityCount,
    lastActivity: p.lastActivity,
    openIssues: p.openIssues,
  }));

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-tour="kpis">
        <Kpi label="At risk" tone="risk" value={String(atRisk)} />
        <Kpi label="Awaiting next step" value={String(awaiting)} />
        <Kpi label="Closed won" value={String(wins)} />
        <Kpi label="Pipeline" value={fmtArr(book)} />
      </div>

      <div data-tour="patch">
        <PatchTable
          engineeringComplete={engineering.complete}
          engineeringConnected={engineering.connected}
          rows={tableRows}
        />
      </div>
    </>
  );
}
