import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Every route is prerenderable: a static shell ships immediately and the per-account reads stream
  // in behind Suspense. The reads here cross a boundary into RDS in us-east-1, so the shell arriving
  // first is the difference between a blank page and a usable one while that round trip happens.
  cacheComponents: true,

  // Same-origin proxy for PostHog. Analytics requests are blocked by hostname, so sending them to
  // our own origin is the difference between measuring everyone and measuring everyone without a
  // content blocker. The /static path is a separate upstream because that is where the SDK and the
  // toolbar are served from.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },

  // Required by the proxy above: without it, trailing-slash normalisation redirects the /ingest
  // routes and the events are lost to a 308 rather than delivered.
  skipTrailingSlashRedirect: true,
};

export default withEve(nextConfig);
