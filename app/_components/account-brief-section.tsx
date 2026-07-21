import Link from "next/link";
import { BriefCard } from "@/app/_components/brief-card";
import type { LatestBrief } from "@/lib/appstore/briefs";

// The last brief Steve shipped for this account, on the page where the evidence for it lives.
//
// Before this the page could only report that a run had happened and how many claims survived, which
// is a receipt for a document nobody could read. An SE whose brief was delivered to Slack had no way
// to get back to it, and the citations in it pointed at a page that then showed none of the reasoning
// they backed.
//
// Rendered by the same component the copilot uses, from the same stored object, so the brief an SE
// reads here is character for character the one that went to the deal channel. A second renderer
// tuned for this page would be a second place for the grounding footer to drift, and that footer is
// the product's central claim.

function daysAgo(when: Date): string {
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function GenerateLink({ accountId, label }: { readonly accountId: string; readonly label: string }) {
  return (
    <Link
      className="shrink-0 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs"
      // Generation stays in the copilot rather than being a button here, and that is deliberate. A
      // brief is a tool call with a visible chain of reads, and the thing worth watching is the gate
      // deciding what ships. A spinner on this page would hide the only part that proves the claim.
      href={`/chat?account=${accountId}`}
    >
      {label}
    </Link>
  );
}

export function AccountBriefSection({
  accountId,
  latest,
}: {
  readonly accountId: string;
  readonly latest: LatestBrief | null | "unavailable";
}) {
  if (latest === "unavailable") {
    return (
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium text-sm">Latest brief</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          The run store could not be read, so the last brief is not shown. The evidence below is
          unaffected.
        </p>
      </section>
    );
  }

  if (!latest) {
    return (
      <section className="mt-6 rounded-xl border border-border border-dashed p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">No brief yet</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Steve has not written one for this account. Everything it would read is below.
            </p>
          </div>
          <GenerateLink accountId={accountId} label="Generate a brief" />
        </div>
      </section>
    );
  }

  // A run recorded before the brief was stored, or one whose payload failed to write. The stats are
  // still true, so they are shown rather than pretending no brief was ever run.
  if (!latest.brief) {
    return (
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">Latest brief</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Ran {daysAgo(latest.createdAt)}: {latest.groundedClaims} claims shipped,{" "}
              {latest.droppedClaims} withheld by the grounding gate. The text was not kept.
            </p>
          </div>
          <GenerateLink accountId={accountId} label="Run it again" />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium text-sm">
          Latest brief{" "}
          <span className="font-normal text-muted-foreground">· {daysAgo(latest.createdAt)}</span>
        </h2>
        <GenerateLink accountId={accountId} label="Run it again" />
      </div>
      <BriefCard brief={latest.brief} />
      <p className="mt-2 text-muted-foreground text-xs">
        Every id in this brief is a row in the evidence below. Click one to land on the record.
      </p>
    </section>
  );
}
