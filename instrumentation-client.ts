import posthog from "posthog-js";

// Product analytics, initialised in Next's client instrumentation hook so it is running before
// hydration rather than after the first render.
//
// Events go to /ingest, a same-origin reverse proxy declared in next.config.ts, instead of straight
// to PostHog. Content blockers filter requests to analytics domains by hostname, and a demo whose
// numbers quietly depend on whether the viewer runs uBlock is not measuring anything. Same-origin
// requests are not filtered that way.
//
// The key in here is a project key, which is write-only by construction: it can send events and
// cannot read a single one back, which is why it is safe in a client bundle. It is still read from
// the environment rather than hardcoded, so an environment without it configured — a laptop, a
// preview branch — sends nothing at all rather than mixing test traffic into the real numbers.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    // Where the toolbar and links should point, since api_host is now a path on our own origin.
    ui_host: "https://us.posthog.com",
    // Pageviews, pageleaves and history-change autocapture, as one dated preset rather than six
    // individual flags that drift apart.
    defaults: "2026-06-25",
    // Anonymous visitors get a profile too. Nobody signs in to this, so without it every reviewer
    // who opens the link is invisible and the geography breakdown is empty.
    person_profiles: "always",
  });

  // Stamped on every event. The project already receives traffic from another application, and
  // without something to separate them the funnels would silently be measuring both at once.
  posthog.register({ app: "steve-v2" });
}
