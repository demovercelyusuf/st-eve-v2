"use client";

import {
  type EveMessageData,
  type UseEveAgentHelpers,
  type UseEveAgentStatus,
  useEveAgent,
} from "eve/react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type ChatIndex,
  type ChatMeta,
  capOpenChats,
  readChatIndex,
  readSavedChat,
  saveSessionCursor,
  writeChatIndex,
  writeSavedChat,
} from "@/lib/copilot/chat-storage";

// One durable eve session per chat, all held above the router, so an SE can start a brief on one account,
// switch to another while it streams, and come back to a finished answer.
//
// The single-session version this replaces owned exactly one useEveAgent call and shared it between the
// dock and /chat. That is still true of the *active* chat — the two surfaces read one conversation — but
// now there is one such conversation per open account, and they run at the same time. eve is explicit that
// this is how concurrency is done: "Create a separate ClientSession per conversation. Do not reuse one
// ClientSession across sidebar conversations." Each ChatSession below is that separate session.
//
// The mounting matters as much as the sessions. Every open chat renders a ChatSession here, in the
// workspace layout the App Router keeps mounted across navigation, and a ChatSession keeps its hook alive
// whether or not it is the one on screen. So switching accounts is a visibility change, not a teardown:
// the turn you switched away from keeps streaming in its still-mounted hook, its answer persists on the
// turn boundary, and its entry in the switcher lights up when it lands.
//
// Only the active chat's agent is surfaced for rendering, through a small external store the sessions
// publish into and the surfaces subscribe to by the active id. That store, rather than React state holding
// the agent, is deliberate: useEveAgent returns a fresh helpers object every render, so pushing it into
// provider state would re-render the provider on every token and, because that re-renders the sessions,
// feed straight back into itself. useSyncExternalStore reads the latest snapshot without owning it.
//
// Why the account is not part of the session. eve binds a session to a caller, not an account, and the
// account stays a per-turn tool argument re-authorized on every read. So a chat is "for" an account only
// by convention: its storage slot is keyed by the account id and its first message names the account. The
// evidence ledger is what makes the split worth the machinery — it resolves a Linear citation only against
// reads recorded in the same session, so keeping each account on its own durable session is what keeps its
// LIN- claims citable across turns.
//
// Saved on turn boundaries only, never per event, exactly as before: serialising a growing log on every
// token is a cost with a bounded downside, since the cursor written at the previous boundary still
// continues the conversation and the server holds the whole turn.

type CopilotAgent = UseEveAgentHelpers<EveMessageData>;

/** The account a new chat is opened for. Just id and name — the picker's two columns. */
export type ChatAccount = { readonly id: string; readonly name: string };

// The live agent of every mounted chat, keyed by chat id, with per-id subscriptions. The sessions publish;
// the surfaces read the active one. Not React state, on purpose — see the module comment.
type AgentRegistry = {
  readonly set: (chatId: string, agent: CopilotAgent) => void;
  readonly remove: (chatId: string) => void;
  readonly getAgent: (chatId: string) => CopilotAgent | undefined;
  readonly subscribe: (chatId: string, listener: () => void) => () => void;
};

function createAgentRegistry(): AgentRegistry {
  const agents = new Map<string, CopilotAgent>();
  const listeners = new Map<string, Set<() => void>>();
  const emit = (chatId: string) => {
    for (const listener of listeners.get(chatId) ?? []) listener();
  };
  return {
    set(chatId, agent) {
      agents.set(chatId, agent);
      emit(chatId);
    },
    remove(chatId) {
      agents.delete(chatId);
      emit(chatId);
    },
    getAgent(chatId) {
      return agents.get(chatId);
    },
    subscribe(chatId, listener) {
      let set = listeners.get(chatId);
      if (!set) {
        set = new Set();
        listeners.set(chatId, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(chatId);
      };
    },
  };
}

type CopilotContextValue = {
  readonly registry: AgentRegistry;
  readonly chats: readonly ChatMeta[];
  readonly activeId: string;
  /** Lifecycle status of any open chat, for the switcher's per-row dot. Defaults to ready. */
  readonly statusOf: (chatId: string) => UseEveAgentStatus;
  /** Chats whose latest reply landed while they were not the one on screen. */
  readonly unread: ReadonlySet<string>;
  readonly hasUnread: boolean;
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  readonly markRead: () => void;
  /** Open the chat for an account, focusing an existing one or creating and seeding a new one. */
  readonly newChat: (account: ChatAccount, opener?: string) => void;
  readonly switchChat: (chatId: string) => void;
  readonly closeChat: (chatId: string) => void;
};

/** What a surface consumes: the context, plus the active chat's agent resolved from the registry. */
export type CopilotValue = Omit<CopilotContextValue, "registry"> & {
  /** The active chat's agent, or undefined for the one paint before its session has registered. */
  readonly agent: CopilotAgent | undefined;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function useCopilot(): CopilotValue {
  const context = useContext(CopilotContext);
  if (context === null) {
    throw new Error("useCopilot must be called inside <CopilotProvider>.");
  }

  const { registry, activeId } = context;
  const agent = useSyncExternalStore(
    useCallback((listener) => registry.subscribe(activeId, listener), [registry, activeId]),
    () => registry.getAgent(activeId),
    () => undefined,
  );

  return { ...context, agent };
}

function seedOpener(account: ChatAccount): string {
  // Names the account so the model resolves it on the first turn; the id rides along so a fuzzy name match
  // cannot land on the wrong account. Mirrors how the empty-state openers already phrase a request.
  return `Give me this week's brief for ${account.name} (${account.id}).`;
}

export function CopilotProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // The open chats and which is active. Read once, synchronously, so the first client render already has
  // the right set of sessions to mount and each ChatSession can seed itself from its own slot at
  // construction. On the server this is the default single-chat index; the dock is ssr:false, so the real
  // one lands on the first client paint.
  const [index, setIndexState] = useState<ChatIndex>(readChatIndex);
  const [statuses, setStatuses] = useState<Record<string, UseEveAgentStatus>>({});
  const [unread, setUnread] = useState<ReadonlySet<string>>(() => new Set());

  const registry = useRef<AgentRegistry>(undefined as unknown as AgentRegistry);
  if (!registry.current) registry.current = createAgentRegistry();

  // First message to send when a brand-new chat's session mounts. Populated by newChat before the session
  // exists, read once by the session, deleted when sent.
  const pendingOpeners = useRef(new Map<string, string>());

  // Read the current active chat and panel state without pinning callback identities to them: the eve
  // callbacks below must stay stable, but still see the latest values when a turn finishes.
  const activeIdRef = useRef(index.activeId);
  activeIdRef.current = index.activeId;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const setIndex = useCallback((next: ChatIndex) => {
    setIndexState(next);
    writeChatIndex(next);
  }, []);

  const reportStatus = useCallback((chatId: string, status: UseEveAgentStatus) => {
    setStatuses((prev) => (prev[chatId] === status ? prev : { ...prev, [chatId]: status }));
  }, []);

  const clearUnread = useCallback((chatId: string) => {
    setUnread((prev) => {
      if (!prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });
  }, []);

  const reportFinished = useCallback((chatId: string) => {
    // A reply is unread only if the reader was not looking at it: the panel is closed, or a different chat
    // is on screen. A turn finishing in the chat the SE is watching is plainly read.
    if (chatId === activeIdRef.current && isOpenRef.current) return;
    setUnread((prev) => {
      if (prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.add(chatId);
      return next;
    });
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    clearUnread(activeIdRef.current);
  }, [clearUnread]);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((wasOpen) => {
      if (!wasOpen) clearUnread(activeIdRef.current);
      return !wasOpen;
    });
  }, [clearUnread]);

  // Called by whichever surface is displaying the active transcript. /chat has to say so itself, because a
  // turn that finishes there is plainly read; the dock clears the same flag by opening.
  const markRead = useCallback(() => clearUnread(activeIdRef.current), [clearUnread]);

  const switchChat = useCallback(
    (chatId: string) => {
      setIndex({ activeId: chatId, chats: index.chats });
      clearUnread(chatId);
    },
    [clearUnread, index.chats, setIndex],
  );

  const closeChat = useCallback(
    (chatId: string) => {
      // Never leave the switcher empty, and never close the accountless general chat out of existence.
      const remaining = index.chats.filter((c) => c.id !== chatId);
      if (remaining.length === 0) return;

      // Closing removes the chat from the open set but keeps its saved slot, so re-opening the account
      // restores the conversation. Its live hook unmounts, so drop the stale status entry too.
      setStatuses((prev) => {
        if (!(chatId in prev)) return prev;
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      clearUnread(chatId);

      const nextActive =
        chatId === index.activeId ? (remaining.at(-1)?.id ?? remaining[0].id) : index.activeId;
      setIndex({ activeId: nextActive, chats: remaining });
    },
    [clearUnread, index.activeId, index.chats, setIndex],
  );

  const newChat = useCallback(
    (account: ChatAccount, opener?: string) => {
      setIsOpen(true);

      // Already open: focus it rather than stacking a duplicate.
      if (index.chats.some((c) => c.id === account.id)) {
        switchChat(account.id);
        return;
      }

      // Brand new only when there is no saved slot to restore. A closed-then-reopened account keeps its
      // transcript, so it must not be seeded a second opener over the top of its history.
      const restoring = readSavedChat(account.id) !== null;
      if (!restoring) {
        pendingOpeners.current.set(account.id, opener ?? seedOpener(account));
      }

      const meta: ChatMeta = {
        id: account.id,
        accountId: account.id,
        label: account.name,
        updatedAt: Date.now(),
      };
      // Protect any chat that is mid-turn from being evicted by the cap when the new one pushes past it.
      const streaming = Object.entries(statuses)
        .filter(([, s]) => s === "submitted" || s === "streaming")
        .map(([id]) => id);
      const capped = capOpenChats(
        { activeId: account.id, chats: [...index.chats, meta] },
        undefined,
        streaming,
      );

      setIndex(capped.index);
      clearUnread(account.id);
    },
    [clearUnread, index.chats, setIndex, statuses, switchChat],
  );

  const statusOf = useCallback(
    (chatId: string): UseEveAgentStatus => statuses[chatId] ?? "ready",
    [statuses],
  );

  const value = useMemo<CopilotContextValue>(
    () => ({
      activeId: index.activeId,
      chats: index.chats,
      close,
      closeChat,
      hasUnread: unread.size > 0,
      isOpen,
      markRead,
      newChat,
      open,
      registry: registry.current,
      statusOf,
      switchChat,
      toggle,
      unread,
    }),
    [
      close,
      closeChat,
      index.activeId,
      index.chats,
      isOpen,
      markRead,
      newChat,
      open,
      statusOf,
      switchChat,
      toggle,
      unread,
    ],
  );

  return (
    <CopilotContext value={value}>
      {index.chats.map((chat) => (
        <ChatSession
          key={chat.id}
          meta={chat}
          onFinished={reportFinished}
          onStatus={reportStatus}
          pendingOpeners={pendingOpeners}
          registry={registry.current}
        />
      ))}
      {children}
    </CopilotContext>
  );
}

// One mounted eve session. Renders nothing: it exists to run the hook and report up. Kept mounted for
// every open chat, active or not, which is what lets a background turn stream to completion after the SE
// has switched away from it.
function ChatSession({
  meta,
  onFinished,
  onStatus,
  pendingOpeners,
  registry,
}: {
  readonly meta: ChatMeta;
  readonly onFinished: (chatId: string) => void;
  readonly onStatus: (chatId: string, status: UseEveAgentStatus) => void;
  readonly pendingOpeners: React.RefObject<Map<string, string>>;
  readonly registry: AgentRegistry;
}) {
  const chatId = meta.id;

  // Consulted only at construction, so the restore has to be in hand before the hook builds its store.
  const [saved] = useState(() => readSavedChat(chatId));
  const openerRef = useRef(pendingOpeners.current.get(chatId));
  const seededRef = useRef(false);

  const agent = useEveAgent({
    initialEvents: saved?.events,
    initialSession: saved?.session,
    onSessionChange: (session) => saveSessionCursor(chatId, session),
    onFinish: (snapshot) => {
      writeSavedChat(chatId, { events: snapshot.events, session: snapshot.session });
      onFinished(chatId);
    },
  });

  // Publish the latest agent snapshot after every render, so the active surface reading through the
  // registry always sees current messages and status. Only subscribers to this chat id re-render, and a
  // session never subscribes to itself, so there is no loop.
  useEffect(() => {
    registry.set(chatId, agent);
  });

  useEffect(() => {
    return () => registry.remove(chatId);
  }, [chatId, registry]);

  useEffect(() => {
    onStatus(chatId, agent.status);
  }, [chatId, agent.status, onStatus]);

  // Seed a brand-new chat's first message once, when its session is ready and empty. Guarded so a restored
  // chat (which arrives with messages) is never seeded over the top of its history.
  useEffect(() => {
    if (seededRef.current) return;
    const opener = openerRef.current;
    if (!opener) return;
    if (agent.data.messages.length > 0) {
      seededRef.current = true;
      return;
    }
    if (agent.status !== "ready") return;
    seededRef.current = true;
    pendingOpeners.current.delete(chatId);
    void agent.send({ message: opener });
  }, [agent, chatId, pendingOpeners]);

  return null;
}
