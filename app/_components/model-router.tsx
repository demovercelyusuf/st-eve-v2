"use client";

import type { EveMessageData } from "eve/react";
import { BRIEF_MODEL, FAILOVER_ORDER, FAST_MODEL, modelForMessage } from "@/lib/model/config";

// The AI Gateway, made visible.
//
// This is not a diagram of how routing works, it is the routing itself. The model shown for the
// current turn comes from modelForMessage, the same function the agent calls to pick one, so the
// panel cannot drift from the behaviour it is describing. If someone changes the intent pattern,
// this changes with it.
//
// The point it exists to make: one credential and one API, so which model serves a turn is a runtime
// decision rather than a deployment. That is hard to believe from a slide and obvious when you watch
// a follow-up land on the fast model half a second after a brief landed on the slow one.

type Message = EveMessageData extends never ? never : { role: string; parts: readonly unknown[] };

function shortModel(id: string): string {
  // "anthropic/claude-sonnet-5" reads as noise in a 13rem column. The provider is already stated by
  // the failover row above it.
  return id.split("/").pop() ?? id;
}

function lastUserText(messages: readonly Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    for (const part of message.parts) {
      const p = part as { type?: string; text?: string };
      if (p.type === "text" && typeof p.text === "string") return p.text;
    }
  }
  return undefined;
}

function toolCalls(messages: readonly Message[]): string[] {
  const names: string[] = [];
  for (const message of messages) {
    for (const part of message.parts) {
      const p = part as { type?: string; toolName?: string };
      if (p.type === "dynamic-tool" && typeof p.toolName === "string") names.push(p.toolName);
    }
  }
  return names;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ModelRouter({
  className,
  messages,
  busy,
}: {
  className?: string;
  messages: readonly Message[];
  busy: boolean;
}) {
  const asked = lastUserText(messages);
  const routed = asked === undefined ? undefined : modelForMessage(asked);
  const tools = toolCalls(messages);

  return (
    <aside
      aria-label="Model router"
      className={[
        "flex w-52 shrink-0 flex-col gap-3 border-border border-l bg-background px-3 py-3 font-mono text-[11px]",
        className ?? "",
      ].join(" ")}
      data-tour="router"
    >
      <div>
        <p className="mb-1.5 font-semibold text-[10px] text-muted-foreground tracking-wider">
          MODEL ROUTER · AI GATEWAY
        </p>
        <Row label="brief" value={shortModel(BRIEF_MODEL)} />
        <Row label="follow-up" value={shortModel(FAST_MODEL)} />
      </div>

      <div className="border-border border-t pt-2">
        <p className="mb-1.5 font-semibold text-[10px] text-muted-foreground tracking-wider">
          PROVIDER FAILOVER
        </p>
        <p className="text-muted-foreground leading-relaxed">{FAILOVER_ORDER.join(" → ")}</p>
      </div>

      <div className="border-border border-t pt-2">
        <p className="mb-1.5 font-semibold text-[10px] text-muted-foreground tracking-wider">
          THIS TURN
        </p>
        {routed === undefined ? (
          <p className="text-muted-foreground">no calls yet</p>
        ) : (
          <>
            <p className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={[
                  "inline-block size-1.5 shrink-0 rounded-full",
                  busy ? "animate-pulse bg-amber-500" : "bg-emerald-500",
                ].join(" ")}
              />
              <span className="truncate font-medium">{shortModel(routed)}</span>
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
              {routed === BRIEF_MODEL
                ? "composing a brief, routed to the stronger model"
                : "a follow-up in context, routed to the faster one"}
            </p>
          </>
        )}
      </div>

      {tools.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-border border-t pt-2">
          <p className="mb-1.5 font-semibold text-[10px] text-muted-foreground tracking-wider">
            TOOLS CALLED
          </p>
          <ul className="flex flex-col gap-1">
            {tools.map((name, i) => (
              <li className="flex items-center gap-1.5 text-foreground" key={`${name}-${i}`}>
                <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
