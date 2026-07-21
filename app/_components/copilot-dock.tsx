"use client";

import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UseEveAgentStatus } from "eve/react";
import { AlertCircleIcon } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
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

// There are two chat surfaces and they are one conversation. Worth stating plainly, because two chat
// UIs with no declared relationship is the most confusing thing in this directory.
//
// This dock is the copilot on every workspace page. /chat is the same conversation at full size,
// rendered by agent-chat.tsx. copilot-provider.tsx owns the single eve session both of them read, so
// switching between them continues a turn rather than starting one. Neither owns state.
//
// Steve, from anywhere. The dock is deliberately not modal: an SE asks about the account they are
// looking at, and the whole value is that the account page stays readable and interactive behind the
// panel. That single decision drives most of what follows, including what this file does NOT do.
//
// It does not own a session. useCopilot hands it the one the root layout created, so closing the dock
// is a display change and nothing else: an in-flight turn keeps streaming, and reopening lands back
// in the middle of it.

// Two routes where a floating launcher is wrong. /chat is this same conversation at full size, so the
// dock would be a second scrolling view of one transcript. The landing page is the pitch, and a chat
// widget there presumes a session a first-time visitor has not asked for.
const HIDDEN_ROUTES = new Set(["/", "/chat"]);

// Shorter than the full page's list. Three fit without the empty state pushing the composer off the
// panel, and these three are the ones an SE mid-page actually reaches for.
const OPENERS = [
  "Give me this week's brief for Northwind.",
  "What is open in engineering against Northwind?",
  "Who has gone quiet on my patch?",
];

export function CopilotDock() {
  const pathname = usePathname();
  const { agent, close, hasUnread, isOpen, open } = useCopilot();
  const launcherRef = useRef<HTMLButtonElement>(null);
  // Real window controls rather than decoration: yellow collapses to the title bar, green fills
  // the screen. Minimising is the one an SE actually uses, because it parks a streaming turn
  // without closing the session behind it.
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const shouldRestoreFocusRef = useRef(false);
  const isHidden = HIDDEN_ROUTES.has(pathname);

  // Every dismissal path routes through here so focus is never left on a node that is about to be
  // removed. Without it, closing with Escape drops focus onto <body> and the next Tab restarts from
  // the top of the document, which on a long account page is a real cost.
  const dismiss = useCallback(() => {
    shouldRestoreFocusRef.current = true;
    close();
  }, [close]);

  // Global toggle. Bound here rather than in the provider so it is automatically dead on the routes
  // where the dock does not exist: pressing it on /chat should do nothing, not open an invisible
  // panel. Chosen over a bare key because the copilot has to be reachable while the caret sits in a
  // filter input, and a modifier chord is the only thing safe to intercept there.
  useEffect(() => {
    if (isHidden) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      if (isOpen) {
        dismiss();
      } else {
        open();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismiss, isHidden, isOpen, open]);

  useEffect(() => {
    if (isOpen || !shouldRestoreFocusRef.current) {
      return;
    }
    shouldRestoreFocusRef.current = false;
    // Absent when the close came from following the full-view link, since the dock unmounts on /chat.
    launcherRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!isSendable(message) || isBusy(agent.status)) {
      return;
    }
    await agent.send({ message: toAgentMessage(message) });
  };

  // Escape is handled on the panel rather than on window: a select or a dropdown inside the panel
  // gets first refusal, and Escape pressed anywhere else on the page is none of the dock's business.
  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) {
      return;
    }
    event.stopPropagation();
    dismiss();
  };

  if (isHidden) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        aria-haspopup="dialog"
        aria-label="Ask Steve"
        data-tour="dock"
        className="press fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-2 rounded-full pr-1 pl-1 transition-transform hover:scale-105"
        onClick={open}
        ref={launcherRef}
        type="button"
      >
        {/* Steve himself is the launcher, floating until you need him. A pill saying "Ask Steve"
            works and reads like every other support widget; the mascot is the thing people
            recognise across the app, so it is what gets tapped. */}
        <span className="relative inline-block float">
          <Image
            alt=""
            className="size-14 object-contain drop-shadow-xl sm:size-16"
            height={64}
            src="/steve.png"
            width={64}
          />
          <span
            aria-hidden
            className={cn(
              "absolute right-0.5 bottom-0.5 inline-block size-3 rounded-full border-2 border-background",
              hasUnread ? "bg-amber-500" : "bg-emerald-500",
            )}
          />
        </span>
        {/* The dot is the only thing marking a reply that landed while the panel was shut, so it has
            to say so out loud for anyone not looking at it. */}
        {hasUnread ? <span className="sr-only">New reply waiting</span> : null}
      </button>
    );
  }

  const isEmpty = agent.data.messages.length === 0;

  return (
    // role="dialog" without aria-modal, which is the honest description: the page behind stays live
    // and focus is not trapped. A trap would mean an SE cannot Tab from the panel to the evidence
    // timeline they are asking about, and a scrim would grey out the thing they are reading.
    <div
      aria-label="Steve, the copilot"
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl",
        "inset-x-0 bottom-0 rounded-t-xl pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:rounded-xl",
        maximized
          ? "top-0 h-dvh sm:inset-3 sm:h-auto"
          : minimized
            ? "h-auto sm:right-4 sm:bottom-4 sm:w-[min(40rem,calc(100vw-2rem))]"
            : // svh rather than dvh for the sheet's own height: dvh changes as Safari's URL bar
              // collapses, which resizes the sheet underneath the finger that is scrolling it.
              "h-[72svh] sm:right-4 sm:bottom-4 sm:h-[min(34rem,calc(100dvh-6rem))] sm:w-[min(40rem,calc(100vw-2rem))]",
      )}
      onKeyDown={handlePanelKeyDown}
      role="dialog"
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-border border-b pr-1.5 pl-3">
        <Light color="#ff5f56" glyph="×" label="Close" onClick={dismiss} />
        <Light
          color="#ffbd2e"
          glyph="–"
          label={minimized ? "Expand" : "Minimize"}
          onClick={() => {
            setMaximized(false);
            setMinimized((m) => !m);
          }}
        />
        <Light
          color="#27c93f"
          glyph="+"
          label={maximized ? "Restore" : "Full screen"}
          onClick={() => {
            setMinimized(false);
            setMaximized((m) => !m);
          }}
        />
        <Wordmark className="ml-1.5" showDot={false} size="sm" />
        <AgentStatusDot status={agent.status} />
        <Link
          className="ml-auto rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          href="/chat"
          onClick={close}
        >
          Full page
        </Link>

        {/* A named exit, phones only. Below sm the maximized panel covers the entire viewport
            including the app's own header, so the traffic lights are the only way back — and
            Escape and Cmd+K, which is how you would leave on a laptop, do not exist on a phone.
            There was 276px of free header space at 390 to say the word. */}
        <button
          className="rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          onClick={dismiss}
          type="button"
        >
          Close
        </button>
      </header>

      {/* Everything below the title bar collapses when minimized, so the yellow light parks the
          panel as a title bar without ending the turn streaming inside it. */}
      <div className={cn("flex min-h-0 flex-1", minimized && "hidden")}>
        {/* min-w-0, which /chat has and this did not. Without it one long token in a message or an
            error string sets this column's min-content width, pushes against the fixed-width router
            rail and gets clipped by the panel. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {agent.error ? (
        <div className="shrink-0 px-3 pt-2">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs">
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <p className="wrap-anywhere text-muted-foreground">{agent.error.message}</p>
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-3">
          <p className="text-muted-foreground text-sm">
            Ask about any account on your patch. Every claim comes back with the record that backs it.
          </p>
          <div className="flex flex-col items-start gap-1.5">
            {OPENERS.map((opener) => (
              <button
                className="rounded-full border border-border px-2.5 py-1 text-left text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground"
                key={opener}
                onClick={() => void agent.send({ message: opener })}
                type="button"
              >
                {opener}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-5 p-3">
            {agent.data.messages.map((message, index) => (
              <AgentMessage
                canRespond={!isBusy(agent.status)}
                compact
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

          <div className="shrink-0 border-border border-t p-2">
            <PromptInput onSubmit={handleSubmit}>
              {/* autoFocus, because the panel mounts only when the SE has just asked for it by click
                  or by ⌘K, and the only thing to do with it is type. */}
              <PromptInputTextarea
                autoFocus
                className="min-h-14"
                placeholder="Ask about an account…"
              />
              <PromptInputSubmit onStop={agent.stop} status={agent.status} />
            </PromptInput>
          </div>
        </div>

        {/* Needs width and height both, hence roomy rather than sm. On a phone the panel is already
            a bottom sheet and 13rem of routing table would take the conversation's whole width; in
            landscape it fits sideways and then has no vertical room to render into. */}
        <ModelRouter
          busy={isBusy(agent.status)}
          className="hidden roomy:flex"
          messages={agent.data.messages}
        />
      </div>
    </div>
  );
}

// A traffic light. The glyph only appears on hover, the way a real one does, but the button carries
// its label for anyone who cannot see the colour or the hover.
function Light({
  color,
  glyph,
  label,
  onClick,
}: {
  color: string;
  glyph: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      // 12px painted, 36px touchable. The dot is a deliberate reference to a window title bar and
      // should stay 12px, but on a phone these three were the only way out of a sheet that covers
      // the whole screen, and a 12px target is a quarter of the 44px iOS minimum — four pixels off
      // the red dot already missed it. The ::before carries the target without moving the dot.
      className="group relative grid size-3 place-items-center rounded-full before:absolute before:-inset-3 before:content-[''] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      onClick={onClick}
      style={{ background: color }}
      title={label}
      type="button"
    >
      <span className="font-bold text-[8px] text-black/60 leading-none opacity-0 transition-opacity group-hover:opacity-100">
        {glyph}
      </span>
    </button>
  );
}

function isBusy(status: UseEveAgentStatus): boolean {
  return status === "submitted" || status === "streaming";
}
