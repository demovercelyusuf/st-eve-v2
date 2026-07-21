import { PRIORITY_LABEL, type RenderableBrief, groundingFooter, sourceUrl } from "@/lib/brief/render";
import { BriefActions } from "./brief-actions";

// The brief on the web, rendered from the emit_brief tool RESULT rather than the model's closing
// prose. Same rule as the Slack card: the prose is unverified markdown that happens to sit next to a
// brief, the tool result is what came out of the grounding gate.
//
// This existed only as Block Kit, which meant the flagship artifact arrived in Slack designed and in
// the browser as collapsed JSON. The web app is where an SE works, so the worse rendering was on the
// surface that matters most.

function Chip({ id, sources }: { readonly id: string; readonly sources?: RenderableBrief["sources"] }) {
  const url = sourceUrl(id, sources);
  const className =
    "rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground";

  // A citation with a url came from a live system and can be clicked back to the record. One without
  // resolves inside this app, so it anchors into the account page's evidence timeline instead.
  if (url) {
    return (
      <a
        className={`${className} underline decoration-dotted underline-offset-2 hover:text-foreground`}
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {id}
      </a>
    );
  }
  return <span className={className}>{id}</span>;
}

function Citations({
  ids,
  sources,
}: {
  readonly ids: string[];
  readonly sources?: RenderableBrief["sources"];
}) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id) => (
        <Chip id={id} key={id} sources={sources} />
      ))}
    </span>
  );
}

export function BriefCard({ brief }: { readonly brief: RenderableBrief }) {
  const { grounding, needsReview, nextSteps, sources, stageRead } = brief;
  const riskTone =
    stageRead.riskLevel === "high"
      ? "text-amber-700 dark:text-amber-400"
      : stageRead.riskLevel === "medium"
        ? "text-foreground"
        : "text-emerald-700 dark:text-emerald-400";

  return (
    <article className="rounded-xl border border-border bg-card">
      <header className="border-border border-b px-4 py-3">
        <h2 className="font-semibold text-base tracking-tight">Weekly brief: {brief.account}</h2>
        <p className="mt-0.5 text-muted-foreground text-xs">
          <span className="font-mono">{brief.accountId}</span> · risk{" "}
          <span className={riskTone}>{stageRead.riskLevel}</span> ·{" "}
          {Math.round(stageRead.confidence * 100)}% confidence
        </p>
      </header>

      <div className="space-y-5 px-4 py-4">
        <section>
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Summary
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed">
            {brief.summary || (
              <span className="text-muted-foreground italic">
                Every summary claim was withheld by the grounding gate.
              </span>
            )}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Salesforce stage
            </h3>
            <p className="mt-1 text-sm">{stageRead.salesforceStage}</p>
          </div>
          <div>
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Grounded read
            </h3>
            <p className="mt-1 text-sm">{stageRead.groundedRead}</p>
          </div>
        </section>

        {stageRead.signals.length > 0 ? (
          <section>
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Signals
            </h3>
            <ul className="mt-1.5 space-y-1.5">
              {stageRead.signals.map((signal) => (
                <li className="flex gap-2 text-sm leading-relaxed" key={signal}>
                  <span aria-hidden className="text-muted-foreground">
                    •
                  </span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Next steps
          </h3>
          {nextSteps.length > 0 ? (
            <ol className="mt-1.5 space-y-2.5">
              {nextSteps.map((step) => (
                <li className="text-sm leading-relaxed" key={step.text}>
                  <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase">
                    {PRIORITY_LABEL[step.priority] ?? step.priority}
                  </span>
                  {step.text}
                  <span className="text-muted-foreground"> · {step.owner}</span>
                  <Citations ids={step.citations} sources={sources} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1.5 text-muted-foreground text-sm italic">
              No next step survived the grounding gate.
            </p>
          )}
        </section>

        {/* The withheld claims. Given a border and its own colour because this is the part an SE
            should read hardest: it is what the copilot refused to say, and why. */}
        {needsReview.length > 0 ? (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <h3 className="font-medium text-amber-700 text-xs uppercase tracking-wide dark:text-amber-400">
              Withheld by the grounding gate
            </h3>
            <ul className="mt-1.5 space-y-2">
              {needsReview.map((dropped) => (
                <li className="text-sm leading-relaxed" key={dropped.text}>
                  <span className="italic">&ldquo;{dropped.text}&rdquo;</span>
                  <span className="block text-muted-foreground text-xs">{dropped.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="border-border border-t px-4 py-2.5">
        <p className="text-muted-foreground text-xs">{groundingFooter(brief)}</p>
        {grounding.droppedClaims === 0 ? (
          <p className="mt-0.5 text-muted-foreground text-xs italic">
            Nothing was withheld on this run. The gate is a backstop, not a guarantee that a claim is
            well judged.
          </p>
        ) : null}
      </footer>

      {/* Below the grounding footer on purpose. What the gate did is the last thing you read before
          deciding whether this is worth sending, so the send lives after it rather than before. */}
      <BriefActions brief={brief} />
    </article>
  );
}
