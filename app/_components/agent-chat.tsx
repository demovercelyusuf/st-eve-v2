"use client";

import { track } from "@/lib/analytics";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { listChatAccounts } from "@/app/_actions/accounts";
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
import { ChatSwitcher } from "./chat-switcher";
import { ModelRouter } from "./model-router";
import { Wordmark } from "./wordmark";
import { useCopilot } from "./copilot-provider";
import { isSendable, toAgentMessage } from "./prompt-message";

const OPENERS = [
  "Give me this week's brief for Northwind.",
  "Is Northwind still blocked on the failover bug?",
  "What engineering issues are open against Northwind?",
  "Brief me on Atlas Manufacturing.",
];

export function AgentChat() {
  // The sessions come from the workspace layout rather than from a useEveAgent call here, so this page and
  // the floating dock read the same conversations. `agent` is the active chat's, which the switcher below
  // lets the SE change; it is undefined for the one paint before that chat's session registers.
  const { agent, markRead, newChat } = useCopilot();

  const messages = agent?.data.messages ?? [];
  const status = agent?.status ?? "ready";
  const error = agent?.error;
  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  // This page is the transcript at full size, so the active chat cannot be unread here. Without this the
  // dock's launcher would still wear an unread dot after the SE navigated away.
  useEffect(() => {
    markRead();
  }, [messages, markRead]);

  // "Generate a brief" from an account page lands here as /chat?account=ACC-…. Open (or focus) that
  // account's chat, resolving its name from the patch so the switcher and the seeded first message read
  // properly. Read from location rather than useSearchParams so this client-only page needs no Suspense
  // boundary, and run once: a refresh re-runs it, but an already-open account simply gets focused.
  const handledAccountRef = useRef(false);
  useEffect(() => {
    if (handledAccountRef.current) return;
    handledAccountRef.current = true;
    const accountId = new URLSearchParams(window.location.search).get("account");
    if (!accountId) return;
    void (async () => {
      const accounts = await listChatAccounts();
      const found = accounts.find((account) => account.id === accountId);
      newChat(found ?? { id: accountId, name: accountId });
    })();
  }, [newChat]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!agent || !isSendable(message) || isBusy) return;
    // The question itself is deliberately not sent. What is worth knowing is that someone asked one and
    // from where; the text is the customer's, and an analytics tool is the wrong place for it.
    track("question_asked", { surface: "chat" });
    await agent.send({ message: toAgentMessage(message) });
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Send a message…" />
      <PromptInputSubmit onStop={() => agent?.stop()} status={status} />
    </PromptInput>
  );

  return (
    // Sized against the shell header rather than the viewport, so the composer sits on the fold instead of
    // just below it. The workspace nav is the way out now, so this page no longer carries its own.
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* The switcher lives here even on an empty chat, because starting a chat for another account is
            the one thing you always want reachable — it is the whole point of the page now. */}
        <header className="flex h-12 shrink-0 items-center gap-3 px-4 sm:h-14">
          <ChatSwitcher />
        </header>

        {error ? (
          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium">Request failed</p>
                <p className="mt-0.5 text-muted-foreground">{error.message}</p>
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
                  isStreaming={status === "streaming" && index === messages.length - 1}
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => agent?.send({ inputResponses })}
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
                // min-height:auto, so this refused to shrink below its content, pushed past the bottom of
                // an overflow-hidden main, and took the composer with it. Centred once there is room.
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
                  contains. Each one exercises a different path: the flagship brief, the fast model, the
                  live Linear read, and a refusal. */}
              <div className="flex flex-wrap justify-center gap-2">
                {OPENERS.map((opener) => (
                  <button
                    className="rounded-full border border-border px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground"
                    key={opener}
                    onClick={() => agent && void agent.send({ message: opener })}
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

      {/* Held back to xl because the shell's sidebar also appears at lg, and both arriving together took
          the conversation column from 768px to 512px. It widens again at 2xl where there is room. */}
      <ModelRouter busy={isBusy} className="hidden w-56 xl:flex 2xl:w-60" messages={messages} />
    </div>
  );
}
