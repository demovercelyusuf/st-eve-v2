import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Every route is prerenderable: a static shell ships immediately and the per-account reads stream
  // in behind Suspense. The reads here cross a boundary into RDS in us-east-1, so the shell arriving
  // first is the difference between a blank page and a usable one while that round trip happens.
  cacheComponents: true,
};

export default withEve(nextConfig);
