import type { HandleMessageStreamEvent, SessionState } from "eve/client";

// What the browser remembers about the copilot conversations, so a reload does not lose them.
//
// eve already persists each conversation on the server: the durable session holds the model's history and
// a fully replayable event stream, parked at session.waiting between turns. What it does not do is tell
// the next page load where to look. The hook keeps its store in a ref, so a refresh drops the pointer and
// the session is orphaned while still existing. eve is explicit about whose job this is:
// "SessionState is a cursor, not a chat transcript. If your app shows historical messages, persist the
// stream events separately."
//
// So two things are saved per chat, and they do different jobs. The cursor lets eve continue the same
// durable session, which is what keeps the evidence ledger valid: emit_brief resolves a Linear citation by
// asking whether a read tool recorded that id in this session, so a new session id would silently drop
// every LIN- claim into needs-review. The event log is what the UI renders, because the projected
// transcript is derived from events rather than stored anywhere.
//
// Now there is more than one conversation. Each account chat is its own durable eve session with its own
// cursor and its own event log, so each gets its own storage slot keyed by a chat id, and a small index
// names the open chats and which one is active. eve's own guidance is the reason they must not share:
// "Do not reuse one ClientSession across sidebar conversations." Reusing a cursor across accounts would
// pair one account's transcript with another's session id and corrupt the ledger for both.
//
// The eve imports here are type-only and erased at build, so this stays a pure module over plain data:
// the serialize and trim halves are testable without a DOM, which is the same split lib/grounding/gate.ts
// uses for the same reason.

export type SavedChat = {
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
};

// One chat in the index. `id` is the storage-slot id — an account id (ACC-…) for an account chat, or the
// reserved general id for the accountless scratch chat. `accountId` is null only for that scratch chat.
export type ChatMeta = {
  readonly id: string;
  readonly accountId: string | null;
  readonly label: string;
  // Milliseconds since epoch, best effort. Used only to order the switcher and to pick a victim when the
  // open set is capped, so an approximate value is fine and a missing one sorts oldest.
  readonly updatedAt: number;
};

export type ChatIndex = {
  readonly activeId: string;
  readonly chats: readonly ChatMeta[];
};

// Per-slot keys carry the chat id; the index is one fixed key. Each carries a version inside rather than
// in the key, so a bump overwrites the old value instead of orphaning it in a browser we never clean up.
const CHAT_KEY_PREFIX = "steve.chat:";
const CHAT_INDEX_KEY = "steve.chat.index";
// The single key the copilot used before it held more than one conversation. Read once, migrated into the
// general slot, then removed, so a reader mid-conversation across the upgrade keeps their transcript.
const LEGACY_CHAT_KEY = "steve.chat";
const SCHEMA_VERSION = 1;
const INDEX_VERSION = 1;

// The accountless scratch conversation. Always present, so the dock has a chat to open before any account
// has been picked, and the openers on an empty chat have somewhere to land.
export const GENERAL_CHAT_ID = "general";
const GENERAL_CHAT_LABEL = "General";

// How many chats stay open at once. A soft cap for tidiness, not a cost limit: creating past it closes the
// least-recently-used chat (its slot is kept, so re-opening restores it), never one that is streaming.
export const MAX_OPEN_CHATS = 15;

// Characters of JSON, not bytes. Browsers count the localStorage quota in UTF-16 code units, so a million
// characters is roughly two megabytes. The origin budget (~5MB) is now shared across every account chat's
// slot as well as the theme and product-tour keys, so this per-chat ceiling is what stops one busy account
// eating the room another needs. A brief carries the full input and output of every read tool inside its
// dynamic-tool parts, so one turn about a busy account is large.
const MAX_SERIALIZED_CHARS = 1_000_000;

type StoredChat = {
  readonly version: number;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
};

type StoredIndex = {
  readonly version: number;
  readonly activeId: string;
  readonly chats: readonly ChatMeta[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Structural only. Validating all twenty-odd event shapes would be a second copy of eve's protocol that
// silently rots against it, so this checks the envelope and trusts the wire: an object carrying a string
// type is enough to catch a truncated or foreign value, which is the failure this guards.
function looksLikeEvent(value: unknown): value is HandleMessageStreamEvent {
  return isRecord(value) && typeof value.type === "string";
}

function looksLikeSession(value: unknown): value is SessionState {
  return isRecord(value) && typeof value.streamIndex === "number";
}

function looksLikeChatMeta(value: unknown): value is ChatMeta {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.accountId === null || typeof value.accountId === "string") &&
    typeof value.label === "string" &&
    typeof value.updatedAt === "number"
  );
}

export function serializeChat(chat: SavedChat): string {
  const stored: StoredChat = {
    version: SCHEMA_VERSION,
    events: chat.events,
    session: chat.session,
  };
  return JSON.stringify(stored);
}

// Returns null for anything it cannot vouch for, and the caller starts a clean conversation.
//
// eve is in public beta and its event shape may change before GA, which docs/SUBMISSION.md already names
// as an accepted risk. A saved log written by an older build must therefore be discardable rather than
// fatal: the worst outcome here is losing a transcript, and the unacceptable one is a stored value that
// throws inside the reducer on every load and leaves the copilot permanently unusable.
export function deserializeChat(raw: string | null): SavedChat | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== SCHEMA_VERSION) return null;
  if (!Array.isArray(parsed.events) || !parsed.events.every(looksLikeEvent)) return null;
  if (!looksLikeSession(parsed.session)) return null;

  return { events: parsed.events, session: parsed.session };
}

export function serializeChatIndex(index: ChatIndex): string {
  const stored: StoredIndex = {
    version: INDEX_VERSION,
    activeId: index.activeId,
    chats: index.chats,
  };
  return JSON.stringify(stored);
}

// Same discard-on-doubt contract as deserializeChat, and the same reason: a corrupt index must reset to a
// clean single-chat state rather than leave the copilot unusable. Also drops chats that fail the shape
// check individually, so one bad row does not throw away the rest, and repairs an activeId that no longer
// names an open chat by falling back to the first.
export function parseChatIndex(raw: string | null): ChatIndex | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== INDEX_VERSION) return null;
  if (!Array.isArray(parsed.chats)) return null;

  const chats = parsed.chats.filter(looksLikeChatMeta);
  if (chats.length === 0) return null;

  const activeId =
    typeof parsed.activeId === "string" && chats.some((c) => c.id === parsed.activeId)
      ? parsed.activeId
      : chats[0].id;

  return { activeId, chats };
}

export function generalChat(updatedAt = 0): ChatMeta {
  return { id: GENERAL_CHAT_ID, accountId: null, label: GENERAL_CHAT_LABEL, updatedAt };
}

function defaultIndex(): ChatIndex {
  return { activeId: GENERAL_CHAT_ID, chats: [generalChat()] };
}

// Keep the open set within the cap by dropping the least-recently-updated chats, never the active one and
// never one named in `protectedIds` (a streaming chat must not be closed out from under its turn). Pure so
// the eviction rule is testable without a DOM. Returns the trimmed index plus the ids that were closed, so
// the caller can drop their slots' hold on memory while leaving the saved transcript in place.
export function capOpenChats(
  index: ChatIndex,
  max: number = MAX_OPEN_CHATS,
  protectedIds: readonly string[] = [],
): { readonly index: ChatIndex; readonly closed: readonly string[] } {
  if (index.chats.length <= max) return { index, closed: [] };

  const keep = new Set<string>([index.activeId, ...protectedIds]);
  // Oldest first among the closable, so the ones evicted are the least recently used.
  const closable = index.chats
    .filter((c) => !keep.has(c.id))
    .sort((a, b) => a.updatedAt - b.updatedAt);

  const toClose = new Set<string>();
  for (const chat of closable) {
    if (index.chats.length - toClose.size <= max) break;
    toClose.add(chat.id);
  }

  return {
    index: { activeId: index.activeId, chats: index.chats.filter((c) => !toClose.has(c.id)) },
    closed: [...toClose],
  };
}

// Drop whole turns off the front until the log fits.
//
// Cutting at an arbitrary index would leave a log that begins midway through a turn, so the reducer would
// project a half message with tool calls whose openings it never saw. turn.started is the only boundary
// where the stream is coherent from that point on.
export function trimToBudget(
  events: readonly HandleMessageStreamEvent[],
  maxChars: number = MAX_SERIALIZED_CHARS,
): readonly HandleMessageStreamEvent[] {
  if (JSON.stringify(events).length <= maxChars) return events;

  for (let i = 0; i < events.length; i++) {
    // Ascending, so the first boundary that fits keeps the most history. Index 0 is skipped because the
    // whole array is what we already know is too large.
    if (i === 0 || events[i]?.type !== "turn.started") continue;
    const candidate = events.slice(i);
    if (JSON.stringify(candidate).length <= maxChars) return candidate;
  }

  // A single turn over the whole budget. Better an empty transcript than a write that fails.
  return [];
}

function storage(): Storage | null {
  // Server render, or a browser with storage disabled. Both are ordinary rather than exceptional, and
  // neither should reach a caller as an error.
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function slotKey(chatId: string): string {
  return `${CHAT_KEY_PREFIX}${chatId}`;
}

export function readSavedChat(chatId: string): SavedChat | null {
  const store = storage();
  if (!store) return null;
  try {
    return deserializeChat(store.getItem(slotKey(chatId)));
  } catch {
    return null;
  }
}

export function clearSavedChat(chatId: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(slotKey(chatId));
  } catch {
    // Nothing to do, and nothing worth breaking a turn over.
  }
}

// Persisting is best effort by design. This runs on a turn boundary in the middle of a conversation, and
// a storage failure must cost the transcript rather than the turn.
export function writeSavedChat(chatId: string, chat: SavedChat): void {
  const store = storage();
  if (!store) return;

  const attempts = [MAX_SERIALIZED_CHARS, Math.floor(MAX_SERIALIZED_CHARS / 4)];
  for (const budget of attempts) {
    try {
      store.setItem(
        slotKey(chatId),
        serializeChat({ events: trimToBudget(chat.events, budget), session: chat.session }),
      );
      return;
    } catch {
      // Almost always QuotaExceededError, and now almost always because a sibling account chat's slot grew
      // rather than this one. Retry once against a quarter of the budget before giving up.
    }
  }

  // Out of room even trimmed. Remove the key rather than leaving whatever was there before, which would
  // restore a transcript that no longer matches the session cursor we were trying to update.
  clearSavedChat(chatId);
}

// The cursor alone, merged over whatever transcript is already stored for this chat.
//
// Called when eve advances the session, which happens at the turn boundary before the final snapshot is
// available. Saving it early is what lets a refresh moments after a reply still continue the same durable
// session instead of orphaning it.
//
// Only ever written with a continuation token present. A cursor holding a session id but no token is the
// shape eve reports for an accepted, still in-flight turn, and sending against it would be rejected: the
// continue route requires the token. Skipping the write leaves the last usable cursor in place.
export function saveSessionCursor(chatId: string, session: SessionState): void {
  if (!session.continuationToken) return;
  writeSavedChat(chatId, { events: readSavedChat(chatId)?.events ?? [], session });
}

export function writeChatIndex(index: ChatIndex): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(CHAT_INDEX_KEY, serializeChatIndex(index));
  } catch {
    // The transcripts survive in their own slots; a lost index only forgets which chats were open, which
    // is recoverable by opening them again.
  }
}

// The open chats and which one is active, migrating the pre-multi-chat single slot on first read.
//
// A reader who had a conversation before the upgrade should not lose it: the old value is adopted as the
// general chat's slot and the legacy key removed, once. After that this is a plain read that falls back to
// a fresh single-chat index whenever nothing valid is stored.
export function readChatIndex(): ChatIndex {
  const store = storage();
  if (!store) return defaultIndex();

  try {
    const existing = parseChatIndex(store.getItem(CHAT_INDEX_KEY));
    if (existing) return existing;

    const legacy = store.getItem(LEGACY_CHAT_KEY);
    if (legacy !== null) {
      // Move the old conversation into the general slot verbatim (it is already a valid StoredChat), then
      // retire the legacy key so this migration runs exactly once.
      try {
        store.setItem(slotKey(GENERAL_CHAT_ID), legacy);
        store.removeItem(LEGACY_CHAT_KEY);
      } catch {
        // If the copy fails we simply start clean; the worst case is losing one pre-upgrade transcript.
      }
    }

    const fresh = defaultIndex();
    writeChatIndex(fresh);
    return fresh;
  } catch {
    return defaultIndex();
  }
}
