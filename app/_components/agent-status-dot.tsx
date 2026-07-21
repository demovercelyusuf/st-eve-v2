"use client";

import type { UseEveAgentStatus } from "eve/react";
import { cn } from "@/lib/utils";

// Shared by both copilot surfaces on purpose. The dock and the full page are one session, so a live
// turn has to look identical wherever the SE happens to be looking at it. Two hand-rolled indicators
// would eventually disagree about what "working" looks like.
export function AgentStatusDot({ status }: { readonly status: UseEveAgentStatus }) {
  const isLive = status === "submitted" || status === "streaming";
  const tone =
    status === "error"
      ? "bg-destructive"
      : isLive
        ? "bg-emerald-500"
        : status === "ready"
          ? "bg-muted-foreground"
          : "bg-muted-foreground/50";

  return (
    <span className="relative flex size-1">
      {isLive ? (
        <span
          className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", tone)}
        />
      ) : null}
      <span className={cn("relative inline-flex size-1 rounded-full transition-colors", tone)} />
    </span>
  );
}
