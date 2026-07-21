import posthog from "posthog-js";

// Named events, for the handful of things that carry product meaning.
//
// Autocapture already records every click and pageview, which answers "what did they touch". It
// cannot answer "did a brief actually ship, and did anyone send it to Slack", because that is a
// claim about the product rather than about the DOM. These are the events worth naming so a funnel
// reads in an SE's language instead of in CSS selectors.
//
// A no-op when PostHog is not configured. The key is inlined at build time, so on a build without
// one this compiles down to nothing rather than throwing on a laptop.
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
