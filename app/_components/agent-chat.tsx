"use client";

import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";
import { AgentStatusDot } from "./agent-status-dot";
import { ModelRouter } from "./model-router";
import { useCopilot } from "./copilot-provider";
import { isSendable, toAgentMessage } from "./prompt-message";

const AGENT_NAME = "Steve";

const OPENERS = [
  "Give me this week's brief for Northwind.",
  "Is Northwind still blocked on the failover bug?",
  "What engineering issues are open against Northwind?",
  "Brief me on Atlas Manufacturing.",
];

export function AgentChat() {
  // The session comes from the root layout rather than from a useEveAgent call here, so this page and
  // the floating dock are one conversation. An SE who asks in the dock and then opens the full view
  // is resizing a window, not starting again.
  const { agent, markRead } = useCopilot();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;

  // This page is the transcript at full size, so nothing on it can be unread. Without this the dock's
  // launcher would still be wearing an unread dot after the SE navigated away from here.
  useEffect(() => {
    markRead();
  }, [agent.data.messages, markRead]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!isSendable(message) || isBusy) return;
    await agent.send({ message: toAgentMessage(message) });
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Send a message…" />
      <PromptInputSubmit onStop={agent.stop} status={agent.status} />
    </PromptInput>
  );

  return (
    // Sized against the shell header rather than the viewport, so the composer sits on the fold
    // instead of just below it. The workspace nav is the way out now, so this page no longer needs
    // to carry its own.
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-end gap-3 pr-4 pl-4">
        {isEmpty ? null : (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
            <AgentStatusDot status={agent.status} />
          </span>
        )}
      </header>

      {agent.error ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Request failed</p>
              <p className="mt-0.5 text-muted-foreground">{agent.error.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {isEmpty ? null : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
            {agent.data.messages.map((message, index) => (
              <AgentMessage
                canRespond={!isBusy}
                isStreaming={
                  agent.status === "streaming" && index === agent.data.messages.length - 1
                }
                key={message.id}
                message={message}
                onInputResponses={(inputResponses) => agent.send({ inputResponses })}
              />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          isEmpty
            ? "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]"
            : "max-w-3xl shrink-0 pb-6",
        )}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
            <p className="text-muted-foreground text-sm">
              Ask about any account on your patch. Every claim comes back with the record that backs
              it.
            </p>
            {/* Canned openers, because a reviewer arriving cold has no idea what this account set
                contains. Each one exercises a different path: the flagship brief, the fast model,
                the live Linear read, and a refusal. */}
            <div className="flex flex-wrap justify-center gap-2">
              {OPENERS.map((opener) => (
                <button
                  className="rounded-full border border-border px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground"
                  key={opener}
                  onClick={() => void agent.send({ message: opener })}
                  type="button"
                >
                  {opener}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="w-full">{composer}</div>
      </div>
      </main>

      {/* Wider than the dock's rail because there is room for it here, and this is the surface
          someone lingers on. Hidden below lg for the same reason it is hidden below sm in the dock. */}
      <ModelRouter
        busy={agent.status === "submitted" || agent.status === "streaming"}
        className="hidden w-60 lg:flex"
        messages={agent.data.messages}
      />
    </div>
  );
}
