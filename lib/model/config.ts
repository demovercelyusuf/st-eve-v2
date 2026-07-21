// Model routing, resolved through the Vercel AI Gateway.
//
// Two models, chosen per turn by what the turn is for. This is the routing decision the Gateway
// exists to make cheap: one API, one credential, and the model becomes a runtime choice rather than a
// deployment.
//
// The split is by intent, not by step, and the cost data is why. A brief runs four model steps and
// they are wildly uneven: 39, 160, 4049 and 598 output tokens. That 4,049 is emit_brief composing
// twenty-odd cited claims, which is both the slowest step and the one where quality matters most, so
// putting a cheaper model on the small steps saves nothing worth having. Routing whole turns does.

export const BRIEF_MODEL = "anthropic/claude-sonnet-5";

// Follow-ups in a thread: "what changed", "show me the evidence for that", "which of these is worst".
// These read what is already in context and answer in a few hundred tokens, which is exactly where a
// faster model costs nothing in quality.
export const FAST_MODEL = "anthropic/claude-haiku-4.5";

// AI Gateway provider failover. These are the upstream providers that serve the models above, in
// preference order. If the first is rate-limited or unavailable, the gateway routes the same request
// to the next one, so a single provider outage never takes the copilot down. The model does not
// change; only which provider serves it does.
export const FAILOVER_ORDER = ["anthropic", "bedrock", "vertex"];

// Does this turn need the brief model?
//
// Deliberately generous. Composing a brief is the expensive path, and misrouting one to the fast
// model produces a visibly worse artifact in front of whoever asked. Misrouting a question to the
// brief model only costs a fraction of a cent. The asymmetry says to guess "brief" when unsure, which
// is also why an empty message resolves to the brief model rather than the fast one.
// Stems are matched with \w* rather than a trailing \b, because a trailing boundary is wrong for a
// stem: "summar" has no word boundary inside "summarise", so the obvious version of this pattern
// routed "summarise Atlas" to the fast model. Same latent bug for "briefing".
const BRIEF_INTENT =
  /\b(?:brief\w*|summar\w*|write[ -]?up|full picture|where\b.*\bstand\w*|status on|catch me up)/i;

export function modelForMessage(text: string | undefined): string {
  if (!text?.trim()) return BRIEF_MODEL;
  return BRIEF_INTENT.test(text) ? BRIEF_MODEL : FAST_MODEL;
}
