// The brief runs on a Claude model routed through the Vercel AI Gateway.
export const BRIEF_MODEL = "anthropic/claude-sonnet-5";

// AI Gateway provider failover. These are the upstream providers that serve the model above, in
// preference order. If the first is rate-limited or unavailable, the gateway routes the same request
// to the next one, so a single provider outage never takes the copilot down. The model does not
// change; only which provider serves it does.
export const FAILOVER_ORDER = ["anthropic", "bedrock", "vertex"];
