"use client";

import { useState } from "react";
import type { RenderableBrief } from "@/lib/brief/render";
import { BrandIcon } from "./brand-icon";

// What an SE does with a brief once they have read it.
//
// The Slack button is the real one: it posts this exact card, built by the same function the agent
// uses when it answers a mention, into the account channel. Two renderers for one artifact is how
// the web and Slack versions of a brief quietly stop agreeing.
//
// The Salesforce button is deliberately dead and says so. Writing to the CRM is a different class of
// action from posting a message, it needs a field mapping and a write scope nobody has agreed yet,
// and shipping a button that half works would be worse than one that is honest about its date.

type PostState =
  | { kind: "idle" }
  | { kind: "posting" }
  | { kind: "posted"; channel: string }
  | { kind: "failed"; reason: string };

export function BriefActions({ brief }: { readonly brief: RenderableBrief }) {
  const [state, setState] = useState<PostState>({ kind: "idle" });

  async function post() {
    setState({ kind: "posting" });
    try {
      const res = await fetch("/api/slack/post-brief", {
        body: JSON.stringify({ brief }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const json = (await res.json()) as
        | { ok: true; channel: string }
        | { ok: false; reason: string };
      setState(json.ok ? { kind: "posted", channel: json.channel } : { kind: "failed", reason: json.reason });
    } catch (error) {
      setState({ kind: "failed", reason: error instanceof Error ? error.message : String(error) });
    }
  }

  const posted = state.kind === "posted";

  return (
    <div className="flex flex-wrap items-center gap-2 border-border border-t px-4 py-3">
      <button
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-medium text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        disabled={state.kind === "posting" || posted}
        onClick={() => void post()}
        type="button"
      >
        <BrandIcon brand="slack" className="size-4" />
        {state.kind === "posting" ? "Posting..." : posted ? "Posted" : "Post to Slack"}
      </button>

      {/* Disabled, and labelled with why. A greyed button with no explanation reads as broken. */}
      <button
        aria-describedby="sfdc-soon"
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-border border-dashed px-3 py-1.5 font-medium text-muted-foreground text-sm opacity-70"
        disabled
        type="button"
      >
        <BrandIcon brand="salesforce" className="size-4 grayscale" />
        {/* The full label needs 273px against a 238px line at 320 and breaks after "SE", leaving the
            icon and the Q4 badge centred against two lines of text. It fits from about 355px up,
            hence the exact threshold rather than sm. */}
        <span className="min-[360px]:hidden">Salesforce SE Notes</span>
        <span className="hidden min-[360px]:inline">Update Salesforce SE Notes</span>
        <span
          className="rounded-full bg-secondary px-1.5 py-0.5 font-semibold text-[10px] text-secondary-foreground tracking-wide"
          id="sfdc-soon"
        >
          Q4
        </span>
      </button>

      <p aria-live="polite" className="min-w-0 text-muted-foreground text-xs">
        {state.kind === "posted" ? (
          <span className="text-emerald-700 dark:text-emerald-400">
            {/* When the channel is configured by id there is no name to show, and "Posted to
                #C0BHFT28R2Q" reads like something leaked. */}
            {/^[CGD][A-Z0-9]{6,}$/.test(state.channel)
              ? "Posted to Slack."
              : `Posted to #${state.channel}.`}
          </span>
        ) : state.kind === "failed" ? (
          <span className="text-destructive">{state.reason}</span>
        ) : null}
      </p>
    </div>
  );
}
