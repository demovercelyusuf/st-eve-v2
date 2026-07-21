import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { type RenderableBrief, groundingFooter } from "@/lib/brief/render";

// The brief as the floating dock shows it.
//
// BriefCard is the right rendering on a surface with room for it. In a 26rem panel it is six sections
// and a withheld-claims block, which turns into a scroll tunnel: the SE loses the question they asked
// and every other message in the thread scrolls away above it. Showing the full card in the dock
// would be showing it badly.
//
// So the dock shows the three things that decide whether the brief is worth reading now: what it is
// about, the single highest-priority next step, and the grounding line. That last one is not a
// summary, it is the product's actual claim, and it is the same sentence the full card and the Slack
// card use. Everything else is one click away in the full view, and because both surfaces share one
// session that click shows this very brief rather than running a new one.
export function BriefPreview({ brief }: { readonly brief: RenderableBrief }) {
  const { grounding, needsReview, nextSteps, stageRead } = brief;
  const lead = nextSteps[0];
  const riskTone =
    stageRead.riskLevel === "high"
      ? "text-amber-700 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <article className="w-full rounded-lg border border-border bg-background/60 p-3">
      <h3 className="font-medium text-sm">Weekly brief: {brief.account}</h3>
      <p className="mt-0.5 text-muted-foreground text-xs">
        <span className="font-mono">{brief.accountId}</span> · risk{" "}
        <span className={riskTone}>{stageRead.riskLevel}</span> ·{" "}
        {Math.round(stageRead.confidence * 100)}% confidence
      </p>

      {lead ? (
        <div className="mt-2.5">
          <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-wide">
            First next step
          </p>
          <p className="mt-1 text-sm leading-snug">{lead.text}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            {lead.owner}
            {/* Plain text rather than the linked chips the full card uses. A citation in the dock is
                there to show the claim is anchored; clicking one would send the SE out to Linear or
                the warehouse from a panel they opened to stay on the page they were reading. */}
            {lead.citations.length > 0 ? (
              <span className="font-mono"> · {lead.citations.join(", ")}</span>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="mt-2.5 text-muted-foreground text-sm italic">
          No next step survived the grounding gate.
        </p>
      )}

      <p className="mt-2.5 text-muted-foreground text-xs">{groundingFooter(brief)}</p>

      <Link
        className="mt-2.5 inline-flex items-center gap-1 font-medium text-xs underline decoration-dotted underline-offset-2 hover:text-foreground"
        href="/chat"
      >
        Open the full brief
        {grounding.droppedClaims > 0 || needsReview.length > 0
          ? ` (${needsReview.length} withheld)`
          : ""}
        <ArrowUpRightIcon className="size-3" />
      </Link>
    </article>
  );
}
