import type posthogType from "posthog-js";

// Analytics, loaded off the critical path and held here once loaded.
//
// The obvious way to do this is `import posthog from "posthog-js"` at the top of the client
// instrumentation hook. That works and costs 71 KB gzipped on every route, in the initial script
// tags, ahead of hydration — including the landing page, which otherwise ships 176 KB and is the
// first thing a reviewer opens. Measuring the page is not worth making the page slower than the
// thing being measured.
//
// So the SDK is a dynamic import fired on idle. It lands in its own async chunk that is not in the
// document's script tags at all, and analytics starts a moment after the page is usable rather than
// a moment before. The cost is that a visitor who leaves within the first second or two is not
// recorded; the pageview is captured on init, so everyone else still is.
//
// The type import above is erased at compile time and costs nothing.
let posthog: typeof posthogType | null = null;

// Named events queued before the SDK finishes loading. Small and bounded: this window is about a
// second, and dropping the events in it would mean losing exactly the fast interactions.
const pending: Array<[string, Record<string, unknown> | undefined]> = [];

export async function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthog) return;

  const mod = await import("posthog-js");
  posthog = mod.default;

  posthog.init(key, {
    // A same-origin path, not a PostHog hostname. Content blockers filter analytics by hostname, and
    // a demo whose numbers depend on whether the viewer runs uBlock is not measuring anything. The
    // rewrite that makes this work is in next.config.ts.
    api_host: "/ingest",
    // Where the toolbar and any links should point, now that api_host is our own origin.
    ui_host: "https://us.posthog.com",
    // Pageview, pageleave and history-change autocapture as one dated preset, rather than six flags
    // that drift apart.
    defaults: "2026-06-25",
    // Nobody signs in to this, so without profiles for anonymous visitors every reviewer who opens
    // the link is invisible and the geography breakdown is empty.
    person_profiles: "always",
  });

  // Stamped on every event. This project already receives traffic from another application, and
  // without something separating them the funnels would quietly be measuring both at once.
  posthog.register({ app: "steve-v2" });

  for (const [event, properties] of pending.splice(0)) {
    posthog.capture(event, properties);
  }
}

// Named events, for the handful of things that carry product meaning.
//
// Autocapture already records every click and pageview, which answers "what did they touch". It
// cannot answer "did a brief actually ship, and did anyone send it to Slack", because that is a
// claim about the product rather than about the DOM.
//
// A no-op when PostHog is not configured. The key is inlined at build time, so a build without one
// compiles this down to nothing rather than throwing on a laptop.
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (posthog) posthog.capture(event, properties);
  else if (pending.length < 20) pending.push([event, properties]);
}
