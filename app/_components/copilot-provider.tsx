"use client";

import { type EveMessageData, type UseEveAgentHelpers, useEveAgent } from "eve/react";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

// One session for the whole app, owned above the router.
//
// useEveAgent holds its store in a ref, so the session lives exactly as long as the component that
// calls the hook. Calling it inside a page would mean a new conversation on every navigation, and the
// case that matters is the one where an SE asks for a brief and then clicks into the account while it
// streams: the turn would be dropped mid-flight. This provider is rendered by the root layout, which
// the App Router keeps mounted across route changes, so the session outlives navigation.
//
// It also means the floating dock and /chat are the same conversation rather than two. The rejected
// alternative was a handoff: eve exposes a serializable session cursor (sessionId, continuationToken,
// streamIndex) that could be stashed and passed back as `initialSession`. That carries the cursor but
// not the projected transcript, so the full page would open on a conversation with no visible
// history, and the two stores would diverge the moment either one sent a turn. Sharing the hook has
// no drift by construction.

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

  // eve reinstalls these callbacks on every render, so this closure always sees the current isOpen.
  // No ref needed, and no stale read of the panel state when a long turn lands.
  const agent = useEveAgent({
    onFinish: () => {
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
