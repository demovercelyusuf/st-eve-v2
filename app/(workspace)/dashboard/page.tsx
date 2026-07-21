import { Suspense } from "react";
import { PatchTable, type PatchTableRow } from "@/app/_components/patch-table";
import { getCaller } from "@/lib/auth/server";
import { getPatchEngineering, getPatchRows } from "@/lib/dashboard/patch";
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

        {/* Two boundaries, not one. The numbers need only the warehouse, so they land as soon as the
            SQL answers. The table also waits on a live Linear read for its engineering column, and
            behind a single boundary that made four integers wait on someone else's API. */}
        <Suspense fallback={<KpiSkeleton />}>
          <PatchKpis />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <PatchBody />
        </Suspense>
      </div>
    </div>
  );
}

async function PatchSubtitle() {
  // The subtitle needs a row count and nothing from Linear, so it takes the warehouse half only.
  const [rows, caller] = await Promise.all([getPatchRows(), getCaller()]);
  return (
    <p className="mt-1 text-muted-foreground text-sm">
      {rows.length} accounts, owned by {caller?.name ?? "you"}. Ask the copilot for a brief on any of
      them.
    </p>
  );
}

// Sized to the real thing rather than a spinner, so the shell does not reflow when the data lands.
//
// These are measured, not guessed. The previous values were a guess and they were wrong by 373px on
// the table, which is a third of a screen of layout shift on the route a demo opens on. 86px is one
// KPI tile and 757px is eleven rows plus the header, which is the whole seeded patch.
function KpiSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div className="h-[86px] animate-pulse rounded-xl border border-border bg-card" key={i} />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {/* Matches the filter row's 537px stack point, so nothing below shifts when it renders. */}
      <div className="mt-6 h-20 animate-pulse rounded-md border border-border bg-card min-[537px]:h-9" />
      <div className="mt-3 h-[757px] animate-pulse rounded-xl border border-border bg-card" />
    </>
  );
}

function Kpi({ label, tone, value }: { label: string; tone?: "risk"; value: string }) {
  const valueClass = tone === "risk" ? "text-amber-700 dark:text-amber-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Two lines of label reserved whatever the width. "Awaiting next step" is 123px set and the
          tile interior is 96px at 320, so it wraps and the row grows — and it does that in two
          separate bands, once in the 2-column layout and again at 640 where four tiles are
          narrower than two were. A breakpoint could only fix one of them, and shortening the label
          costs the meaning. Reserving the line costs 16px and cannot shift. */}
      <div className="min-h-8 text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-semibold text-2xl tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

async function PatchKpis() {
  const rows = await getPatchRows();
  const atRisk = rows.filter((p) => p.riskFlag === "At Risk").length;
  const awaiting = rows.filter((p) => !p.nextStep && p.stage && !isClosed(p.stage)).length;
  const wins = rows.filter((p) => p.stage === "Closed Won").length;
  const book = rows.reduce((sum, p) => sum + (p.arr || 0), 0);

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-tour="kpis">
      <Kpi label="At risk" tone="risk" value={String(atRisk)} />
      <Kpi label="Awaiting next step" value={String(awaiting)} />
      <Kpi label="Closed won" value={String(wins)} />
      <Kpi label="Pipeline" value={fmtArr(book)} />
    </div>
  );
}

async function PatchBody() {
  // Both cached per request, so the rows are read once even though two boundaries ask for them.
  const [rows, engineering] = await Promise.all([getPatchRows(), getPatchEngineering()]);

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
    openIssues: engineering.connected ? (engineering.openByAccount[p.accountId] ?? 0) : null,
  }));

  return (
    <div data-tour="patch">
      <PatchTable
        engineeringComplete={engineering.complete}
        engineeringConnected={engineering.connected}
        rows={tableRows}
      />
    </div>
  );
}
