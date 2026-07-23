"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import type { EveMessage } from "eve/react";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Wordmark } from "./wordmark";
import { useCopilot } from "./copilot-provider";
import { isSendable, toAgentMessage } from "./prompt-message";

const AGENT_NAME = "Steve";

const OPENERS = [
  "Give me this week's brief for Northwind.",
  "Is Northwind still blocked on the failover bug?",
  "What engineering issues are open against Northwind?",
  "Brief me on Atlas Manufacturing.",
];

// Stable identity, so the pre-hydration render does not hand a fresh array to the transcript on every
// pass and invalidate everything downstream of it.
const EMPTY_MESSAGES: readonly EveMessage[] = [];

export function AgentChat() {
  // The session comes from the workspace layout rather than from a useEveAgent call here, so this page
  // and the floating dock are one conversation. An SE who asks in the dock and then opens the full view
  // is resizing a window, not starting again.
  const { agent, markRead } = useCopilot();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  // A restored conversation is only knowable in a browser, and this page is prerendered. Reading it
  // straight through would mean the first client render disagreed with the static shell, which React
  // resolves by throwing the subtree away and rendering it again, with a hydration error to match.
  //
  // So the shell renders exactly what it always did, an empty chat, and the transcript arrives on the
  // next paint. The dock does not need this because it is already ssr: false; making this page
  // client-only would fix it too, at the cost of the whole shell, which is the one thing on /chat that
  // is worth prerendering.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const messages = hydrated ? agent.data.messages : EMPTY_MESSAGES;
  const isEmpty = messages.length === 0;

  // This page is the transcript at full size, so nothing on it can be unread. Without this the dock's
  // launcher would still be wearing an unread dot after the SE navigated away from here.
  useEffect(() => {
    markRead();
  }, [agent.data.messages, markRead]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!isSendable(message) || isBusy) return;
    // The question itself is deliberately not sent. What is worth knowing is that someone asked one
    // and from where; the text is the customer's, and an analytics tool is the wrong place for it.
    track("question_asked", { surface: "chat" });
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
      {/* Nothing renders in here on an empty chat, and 56px of empty bar under the shell's own 56px
          is a fifth of a small phone spent on chrome that says nothing. It collapses until there is
          something to put in it. */}
      <header
        className={cn(
          "flex shrink-0 items-center justify-end gap-3 px-4",
          isEmpty ? "h-0" : "h-10 sm:h-14",
        )}
      >
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
            {messages.map((message, index) => (
              <AgentMessage
                canRespond={!isBusy}
                isStreaming={agent.status === "streaming" && index === messages.length - 1}
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
            ? // min-h-0 is the whole fix and it is not optional: a flex item defaults to
              // min-height:auto, so this refused to shrink below its content, pushed past the
              // bottom of an overflow-hidden main, and took the composer with it. At 320x568 the
              // send button sat entirely below the clip line; in landscape the textarea went too,
              // leaving no way to type at all. Centred once there is room to centre.
              "flex max-w-xl min-h-0 flex-1 flex-col items-center justify-end gap-4 overflow-y-auto pb-4 sm:justify-center sm:gap-8 sm:pb-[10vh]"
            : "max-w-3xl shrink-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <h1>
              <Wordmark showDot={false} size="xl" />
            </h1>
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

      {/* Held back to xl because the shell's sidebar also appears at lg, and both arriving together
          took the conversation column from 768px to 512px — its narrowest anywhere above 640. It
          widens again at 2xl where there is room for the extra rail without charging the reading
          column for it. */}
      <ModelRouter
        busy={agent.status === "submitted" || agent.status === "streaming"}
        className="hidden w-56 xl:flex 2xl:w-60"
        messages={messages}
      />
    </div>
  );
}
