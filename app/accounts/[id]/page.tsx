import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RiskBadge } from "@/app/_components/badges";
import { Nav } from "@/app/_components/nav";
import { getLatestBriefRun } from "@/lib/appstore/briefs";
import { fmtArr } from "@/lib/format";
import { getSalesforceAccount } from "@/lib/salesforce/adapter";
import { getAccountActivity } from "@/lib/warehouse/repository";

// params is request-time data, so awaiting it at the page top would block the prerender. The promise
// is forwarded into the child and awaited there instead, which keeps the chrome and the back link in
// the static shell while the account itself streams in behind Suspense.
export default function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Nav />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href="/dashboard">
          ← Patch
        </Link>
        <Suspense fallback={<AccountSkeleton />}>
          <AccountDetail params={params} />
        </Suspense>
      </div>
    </main>
  );
}

function AccountSkeleton() {
  return (
    <div className="mt-3 space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-card" />
      <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sfdc, activity, lastRun] = await Promise.all([
    getSalesforceAccount(id),
    getAccountActivity(id),
    getLatestBriefRun(id),
  ]);
  if (!sfdc) notFound();

  const opp = sfdc.opportunities[0];
  const timeline = [...activity].reverse();

  return (
    <>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-semibold text-2xl tracking-tight">{sfdc.name}</h1>
          <RiskBadge risk={opp?.riskFlag ?? null} />
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          {sfdc.industry ?? "Account"} · owned by {sfdc.ownerSe ?? "unassigned"}
        </p>

        {opp ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="font-medium">{opp.name}</div>
            <div className="mt-1 text-muted-foreground text-sm">
              {opp.stage} · {fmtArr(opp.amount ?? 0)}
              {opp.closeDate ? ` · close ${opp.closeDate}` : ""}
            </div>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Next step: </span>
              {opp.nextStep ?? <span className="text-amber-700 dark:text-amber-400">none set</span>}
            </div>
          </section>
        ) : null}

        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium text-sm">Contacts</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {sfdc.contacts.map((c) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={c.contactId}>
                <span className="min-w-0 truncate">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground"> · {c.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {c.role ? (
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {c.role.replace(/_/g, " ")}
                    </span>
                  ) : null}
                  {c.active ? null : (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                      departed
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-sm">Latest brief</h2>
            <Link
              href="/chat"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs"
            >
              Generate a brief
            </Link>
          </div>
          {lastRun ? (
            <p className="mt-3 text-muted-foreground text-sm">
              Last run {String(lastRun.createdAt).slice(0, 10)}: {lastRun.groundedClaims ?? 0} claims
              shipped, {lastRun.droppedClaims ?? 0} withheld by the grounding gate.
            </p>
          ) : (
            <p className="mt-3 text-muted-foreground text-sm">
              No brief run yet. Open the copilot to generate one.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-medium text-sm">Activity ({activity.length})</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {timeline.map((a) => (
              <li className="rounded-lg border border-border bg-card px-4 py-3" key={a.activityId}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2 text-sm">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs">
                      {a.activityId}
                    </span>
                    <span className="font-medium">{a.summary}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {a.occurredAt}
                  </span>
                </div>
                {a.detail ? <p className="mt-1.5 text-muted-foreground text-sm">{a.detail}</p> : null}
              </li>
            ))}
          </ol>
        </section>
    </>
  );
}
