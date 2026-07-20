import Link from "next/link";
import { RiskBadge } from "@/app/_components/badges";
import { Nav } from "@/app/_components/nav";
import { getPatchOverview } from "@/lib/dashboard/patch";
import { fmtArr } from "@/lib/format";

export const dynamic = "force-dynamic";

const CLOSED = new Set(["Closed Won", "Closed Lost"]);

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "risk" }) {
  const valueClass = tone === "risk" ? "text-amber-700 dark:text-amber-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-semibold text-2xl tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const patch = await getPatchOverview();
  const atRisk = patch.filter((p) => p.riskFlag === "At Risk").length;
  const awaiting = patch.filter((p) => !p.nextStep && p.stage && !CLOSED.has(p.stage)).length;
  const wins = patch.filter((p) => p.stage === "Closed Won").length;
  const book = patch.reduce((sum, p) => sum + (p.arr || 0), 0);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav active="patch" />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Your patch</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {patch.length} accounts, owned by J. Okafor. Ask the copilot for a brief on any of them.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="At risk" value={String(atRisk)} tone="risk" />
          <Kpi label="Awaiting next step" value={String(awaiting)} />
          <Kpi label="Closed won" value={String(wins)} />
          <Kpi label="Book" value={fmtArr(book)} />
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {patch.map((p) => (
            <Link
              key={p.accountId}
              href={`/accounts/${p.accountId}`}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    <RiskBadge risk={p.riskFlag} />
                  </div>
                  <div className="mt-0.5 text-muted-foreground text-xs">
                    {p.industry}
                    {p.segment ? ` · ${p.segment}` : ""} · {fmtArr(p.arr)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {p.stage ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {p.stage}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">No opportunity</span>
                  )}
                </div>
              </div>

              <div className="mt-3 text-sm">
                {p.nextStep ? (
                  <span className="text-muted-foreground">
                    <span className="text-foreground">Next:</span> {p.nextStep}
                  </span>
                ) : p.stage && !CLOSED.has(p.stage) ? (
                  <span className="text-amber-700 dark:text-amber-400">Awaiting next step</span>
                ) : (
                  <span className="text-muted-foreground">No open action</span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
                <span>
                  {p.activityCount} activities
                  {p.lastActivity ? ` · last ${p.lastActivity}` : ""}
                </span>
                <span className="opacity-0 transition group-hover:opacity-100">View account →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
