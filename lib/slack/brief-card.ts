import { Card, CardText, Divider, Field, Fields } from "eve/channels/slack";
import type { CardElement } from "eve/channels/slack";
import {
  PRIORITY_LABEL,
  type RenderableBrief,
  briefFallbackText,
  groundingFooter,
  sourceUrl,
} from "../brief/render";

export type { RenderableBrief };
export { briefFallbackText, groundingFooter };

// The brief, as it lands in the deal channel.
//
// Rendered from the emit_brief tool RESULT, never from the model's closing prose. The prose is
// unverified markdown that happens to sit next to a brief; the tool result is what came out of the
// grounding gate. Posting the wrong one would put uncited text in a channel under a cited-looking
// heading, which is the exact failure this whole system exists to prevent.
//
// Pure on purpose: no eve runtime, no network, no session. It takes a shape and returns a card, so it
// can be tested against a fixture rather than by running a turn and reading Slack.

// Slack caps a section at 3,000 characters. cardToBlocks truncates for us, but clamping here keeps
// the ellipsis somewhere sensible instead of mid-word at the limit.
const SECTION = 2_800;
const MAX_STEPS = 8;
const MAX_SIGNALS = 6;
const MAX_REVIEW = 6;

function clamp(text: string, limit = SECTION): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

// Slack's mrkdwn is not markdown. Escaping the three characters that carry meaning stops a stray
// ampersand or angle bracket in a customer's ticket title from being read as markup.
function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A citation renders as a plain code chip unless the evidence ledger gave us a url, in which case it
// becomes a link straight back to the record. That is the difference an engineer notices: a chip you
// can click came from outside the warehouse.
function chip(id: string, sources?: RenderableBrief["sources"]): string {
  const url = sourceUrl(id, sources);
  return url ? `<${url}|${esc(id)}>` : `\`${esc(id)}\``;
}

export function briefCard(brief: RenderableBrief): CardElement {
  const children: unknown[] = [];

  children.push(CardText("*Summary*"));
  children.push(
    CardText(
      clamp(esc(brief.summary)) || "_Every summary claim was withheld by the grounding gate._",
    ),
  );

  children.push(
    Fields([
      Field({ label: "Salesforce stage", value: clamp(esc(brief.stageRead.salesforceStage), 200) }),
      Field({ label: "Risk", value: brief.stageRead.riskLevel }),
      Field({ label: "Confidence", value: `${Math.round(brief.stageRead.confidence * 100)}%` }),
      Field({ label: "Grounded read", value: clamp(esc(brief.stageRead.groundedRead), 400) }),
    ]),
  );

  if (brief.stageRead.signals.length > 0) {
    // Joined into one CardText rather than mapped. Every CardText becomes its own Slack block and a
    // message caps at 50, so a wordy account could otherwise push the withheld claims off the end,
    // losing the one part of the brief that must never be dropped.
    children.push(Divider(), CardText("*Signals*"));
    children.push(
      CardText(
        clamp(
          brief.stageRead.signals
            .slice(0, MAX_SIGNALS)
            .map((s) => `• ${esc(s)}`)
            .join("\n"),
        ),
      ),
    );
  }

  children.push(Divider(), CardText("*Next steps*"));
  if (brief.nextSteps.length > 0) {
    // The citations ride on every line on purpose. An SE should be able to see that each step traces
    // to a real record without opening anything.
    children.push(
      CardText(
        clamp(
          brief.nextSteps
            .slice(0, MAX_STEPS)
            .map((s) => {
              const cites = s.citations.map((id) => chip(id, brief.sources)).join(" ");
              return `*${PRIORITY_LABEL[s.priority] ?? s.priority.toUpperCase()}* ${esc(s.text)}\n_${esc(s.owner)}_ · ${cites}`;
            })
            .join("\n\n"),
        ),
      ),
    );
  } else {
    children.push(CardText("_No next step survived the grounding gate._"));
  }

  // The withheld claims. Loud, because Slack is the moment of judgment: this is where an SE decides
  // whether to trust the brief, and what the copilot refused to say is the most useful thing on the
  // card when the model was reaching.
  if (brief.needsReview.length > 0) {
    children.push(Divider(), CardText(":warning: *Withheld by the grounding gate*"));
    children.push(
      CardText(
        clamp(
          brief.needsReview
            .slice(0, MAX_REVIEW)
            .map((d) => `• _"${esc(d.text)}"_\n   ${esc(d.reason)}`)
            .join("\n"),
        ),
      ),
    );
  }

  children.push(Divider());
  children.push(CardText(`_${groundingFooter(brief)}_`));

  return Card({
    title: clamp(`Weekly brief: ${brief.account}`, 140),
    subtitle: `${brief.accountId} · risk ${brief.stageRead.riskLevel}`,
    children,
  } as never) as CardElement;
}

