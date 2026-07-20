import { getRunCosts } from "@/lib/appstore/spend";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return `$${n.toFixed(4)}`;
}

export default async function SpendPage() {
  const runs = await getRunCosts(25);
  const total = runs.reduce((sum, r) => sum + r.costUsd, 0);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">Per-run spend</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              The AI Gateway's own reported cost, summed across each run's model steps. Cost
              attribution, not an invoice.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-right">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Total, last {runs.length} runs
            </div>
            <div className="font-mono font-semibold text-xl tabular-nums">{money(total)}</div>
          </div>
        </header>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Steps</th>
                <th className="px-3 py-2 text-right font-medium">Tokens in / out</th>
                <th className="px-3 py-2 text-right font-medium">Cost</th>
                <th className="px-3 py-2 text-right font-medium">Grounded</th>
                <th className="px-3 py-2 text-right font-medium">Dropped</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    No runs yet. Ask the copilot for a brief and it will show up here.
                  </td>
                </tr>
              ) : (
                runs.map((r, i) => (
                  <tr className="border-border/60 border-b last:border-0" key={r.sessionId ?? i}>
                    <td className="px-3 py-2 font-medium">{r.accountId}</td>
                    <td className="px-3 py-2 tabular-nums">{r.steps}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {r.inputTokens.toLocaleString()} / {r.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{money(r.costUsd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.groundedClaims ?? "-"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.droppedClaims ? (
                        <span className="text-amber-600 dark:text-amber-500">{r.droppedClaims}</span>
                      ) : (
                        (r.droppedClaims ?? "-")
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
