import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountBriefSection } from "@/app/_components/account-brief-section";
import { EvidenceTimeline } from "@/app/_components/evidence-timeline";
import { RiskBadge } from "@/app/_components/badges";
import { getAccountEvidence } from "@/lib/account/timeline";
import { getLatestBrief } from "@/lib/appstore/briefs";
import { fmtArr } from "@/lib/format";
import { STAGE_PATH, isClosed, stagePosition } from "@/lib/salesforce/stages";
import { getAccount } from "@/lib/warehouse/repository";

// params is request-time data, so awaiting it at the page top would block the prerender. The promise
// is forwarded into the child and awaited there instead, which keeps the chrome and the back link in
// the static shell while the account itself streams in behind Suspense.
export default function AccountPage({ params }: { readonly params: Promise<{ id: string }> }) {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href="/dashboard">
          ← Patch
        </Link>
        <Suspense fallback={<AccountSkeleton />}>
          <AccountDetail params={params} />
        </Suspense>
      </div>
    </div>
  );
}

// The tab, because an SE opens four of these at once while writing one brief and "Steve" four times
// over is not navigable. The root layout already supplies the "%s · Steve" template, so this returns
// the name alone.
//
// Wrapped rather than left to throw: metadata failing is a 500 on a page whose body would have
// rendered fine, and a generic tab title is a much smaller loss than the account.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const account = await getAccount(id);
    return account ? { title: account.name } : {};
  } catch {
    return {};
  }
}

// Sized to the real thing rather than a spinner, so the shell does not reflow when the data lands.
function AccountSkeleton() {
  return (
    <div className="mt-3 space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-card" />
      <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}

// The path to a technical win, left to right. Read-only, because Steve reads and never writes: the
// stage belongs to Salesforce, and a control here that appeared to change it would be a write this
// product does not make. An unrecognised stage shows on its own rather than claiming a position it
// does not have.
function StageTracker({ stage }: { readonly stage: string | null }) {
  const current = stagePosition(stage);
  if (stage && current === -1) {
    return (
      <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
        {stage}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGE_PATH.map((s, i) => (
        <span
          aria-current={i === current ? "step" : undefined}
          className={`rounded-full px-2.5 py-1 text-xs ${
            i === current
              ? "bg-primary font-medium text-primary-foreground"
              : i < current
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
          }`}
          key={s}
        >
          {i < current ? `✓ ${s}` : s}
        </span>
      ))}
    </div>
  );
}

async function AccountDetail({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Settled rather than awaited together. The evidence read already degrades per source inside
  // lib/account/timeline.ts; this outer settle covers the app-store, which is a different database
  // entirely. An SE who came to read the records should get them even when the run store is down.
  const [evidenceResult, briefResult] = await Promise.allSettled([
    getAccountEvidence(id),
    getLatestBrief(id),
  ]);

  if (evidenceResult.status === "rejected") throw evidenceResult.reason;
  const evidence = evidenceResult.value;
  if (!evidence) notFound();

  const { account, linearConnected, opportunity, rows, sources } = evidence;
  const latest = briefResult.status === "fulfilled" ? briefResult.value : "unavailable";

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">{account.name}</h1>
        <RiskBadge risk={opportunity?.riskFlag ?? null} />
      </div>
      <p className="mt-1 text-muted-foreground text-sm">
        {account.industry}
        {account.segment ? ` · ${account.segment}` : ""} · {fmtArr(account.arr)} · owned by{" "}
        {account.seOwner}
      </p>

      {opportunity ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">{opportunity.name}</div>
              <div className="mt-1 text-muted-foreground text-sm">
                <span className="font-mono text-xs">{opportunity.oppId}</span> ·{" "}
                {fmtArr(opportunity.amount ?? 0)}
                {opportunity.closeDate ? ` · close ${opportunity.closeDate}` : ""}
              </div>
            </div>
            <a
              // The header is a summary of a record that also has a row below, so it links to that row
              // rather than repeating its detail. One id, one place it resolves.
              className="shrink-0 text-muted-foreground text-xs underline decoration-dotted underline-offset-2 hover:text-foreground"
              href={`#${opportunity.oppId}`}
            >
              See the record
            </a>
          </div>
          <div className="mt-4">
            <StageTracker stage={opportunity.stage} />
          </div>
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">Next step: </span>
            {opportunity.nextStep ?? (
              <span className="text-amber-700 dark:text-amber-400">
                {isClosed(opportunity.stage) ? "none, the deal is closed" : "none set"}
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-border border-dashed p-5">
          <p className="text-muted-foreground text-sm">
            No open opportunity is linked to this account in Salesforce.
          </p>
        </section>
      )}

      <AccountBriefSection accountId={account.accountId} latest={latest} />

      <EvidenceTimeline linearConnected={linearConnected} rows={rows} sources={sources} />
    </>
  );
}
