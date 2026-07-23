"use client";

import { type EveMessageData, type UseEveAgentHelpers, useEveAgent } from "eve/react";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { readSavedChat, saveSessionCursor, writeSavedChat } from "@/lib/copilot/chat-storage";

// One session for the whole app, owned above the router.
//
// useEveAgent holds its store in a ref, so the session lives exactly as long as the component that
// calls the hook. Calling it inside a page would mean a new conversation on every navigation, and the
// case that matters is the one where an SE asks for a brief and then clicks into the account while it
// streams: the turn would be dropped mid-flight. This provider is rendered by the workspace layout,
// which the App Router keeps mounted across route changes, so the session outlives navigation.
//
// It also means the floating dock and /chat are the same conversation rather than two. The rejected
// alternative was a handoff between two hooks, each holding its own store: the cursor alone carries no
// transcript, so the full page would open on a conversation with no visible history, and the two
// stores would diverge the moment either one sent a turn. Sharing one hook has no drift by
// construction, and that is still why this lives here.
//
// What the cursor could not do for a handoff it does do for a reload, once the event log travels with
// it. Both are restored below, and they are two different jobs. The cursor continues the durable eve
// session, which is what keeps the evidence ledger valid: emit_brief resolves a Linear citation by
// asking whether a read tool recorded that id in this session, so starting a new one would silently
// drop every LIN- claim into needs-review. The events are what the reducer projects back into a
// transcript, because the rendered messages are derived state and live nowhere else.
//
// Saved on turn boundaries only, never per event. Persisting inside the stream would mean serialising
// a growing log on every token, and the cost of not doing it is bounded: a refresh mid-turn loses that
// turn's rendered output, while the cursor written at the previous boundary still continues the
// conversation and the server-side stream still holds the whole turn.

type CopilotAgent = UseEveAgentHelpers<EveMessageData>;

type CopilotContextValue = {
  readonly agent: CopilotAgent;
  readonly close: () => void;
  /** A turn finished while no surface was showing it. Drives the dot on the closed launcher. */
  readonly hasUnread: boolean;
  readonly isOpen: boolean;
  readonly markRead: () => void;
  readonly open: () => void;
  readonly toggle: () => void;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function useCopilot(): CopilotContextValue {
  const value = useContext(CopilotContext);
  if (value === null) {
    throw new Error("useCopilot must be called inside <CopilotProvider>.");
  }
  return value;
}

export function CopilotProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Read once, synchronously, before the hook builds its store. initialEvents and initialSession are
  // only consulted at construction, so an effect would arrive too late and there is no imperative way
  // to load a transcript afterwards.
  //
  // On the server this is null, so a restored conversation appears on the first client render and not
  // in the prerendered HTML. Each surface that draws the transcript settles that its own way: the dock
  // is already ssr: false, and /chat holds the empty shell for one paint.
  const [saved] = useState(readSavedChat);

  // eve reinstalls these callbacks on every render, so this closure always sees the current isOpen.
  // No ref needed, and no stale read of the panel state when a long turn lands.
  const agent = useEveAgent({
    initialEvents: saved?.events,
    initialSession: saved?.session,
    // Fires when eve advances the session, which is ahead of the final snapshot. Saving the cursor
    // there is what lets a refresh moments after a reply continue the same session rather than orphan
    // it. It writes only once a continuation token exists; see the note in chat-storage.ts.
    onSessionChange: saveSessionCursor,
    onFinish: (snapshot) => {
      writeSavedChat({ events: snapshot.events, session: snapshot.session });
      if (!isOpen) {
        setHasUnread(true);
      }
    },
  });

  const open = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((wasOpen) => {
      if (!wasOpen) {
        setHasUnread(false);
      }
      return !wasOpen;
    });
  }, []);

  // Called by whichever surface is actually displaying the transcript. The dock clears the dot by
  // opening; /chat has to say so itself, because a turn that finishes there is plainly read.
  const markRead = useCallback(() => {
    setHasUnread(false);
  }, []);

  const value = useMemo<CopilotContextValue>(
    () => ({ agent, close, hasUnread, isOpen, markRead, open, toggle }),
    [agent, close, hasUnread, isOpen, markRead, open, toggle],
  );

  return <CopilotContext value={value}>{children}</CopilotContext>;
}
