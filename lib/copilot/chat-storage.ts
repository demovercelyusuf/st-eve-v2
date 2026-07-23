import type { HandleMessageStreamEvent, SessionState } from "eve/client";

// What the browser remembers about the copilot conversation, so a reload does not lose it.
//
// eve already persists the conversation on the server: the durable session holds the model's history and
// a fully replayable event stream, parked at session.waiting between turns. What it does not do is tell
// the next page load where to look. The hook keeps its store in a ref, so a refresh drops the pointer and
// the session is orphaned while still existing. eve is explicit about whose job this is:
// "SessionState is a cursor, not a chat transcript. If your app shows historical messages, persist the
// stream events separately."
//
// So two things are saved, and they do different jobs. The cursor lets eve continue the same durable
// session, which is what keeps the evidence ledger valid: emit_brief resolves a Linear citation by asking
// whether a read tool recorded that id in this session, so a new session id would silently drop every
// LIN- claim into needs-review. The event log is what the UI renders, because the projected transcript is
// derived from events rather than stored anywhere.
//
// The eve imports here are type-only and erased at build, so this stays a pure module over plain data:
// the serialize and trim halves are testable without a DOM, which is the same split lib/grounding/gate.ts
// uses for the same reason.

export type SavedChat = {
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
};

// One stable key carrying a version inside, rather than the version in the key. A bump then overwrites
// the old value instead of orphaning it, and nothing accumulates in a browser we never clean up.
export const CHAT_STORAGE_KEY = "steve.chat";
const SCHEMA_VERSION = 1;

// Characters of JSON, not bytes. Browsers count the localStorage quota in UTF-16 code units, so a
// million characters is roughly two megabytes against a typical five megabyte origin budget, shared with
// the theme and product-tour keys. The headroom is deliberate: a brief carries the full input and output
// of every read tool inside its dynamic-tool parts, so one turn about a busy account is large.
const MAX_SERIALIZED_CHARS = 1_000_000;

type StoredChat = {
  readonly version: number;
  readonly events: readonly HandleMessageStreamEvent[];
  readonly session: SessionState;
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

export function readSavedChat(): SavedChat | null {
  const store = storage();
  if (!store) return null;
  try {
    return deserializeChat(store.getItem(CHAT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearSavedChat(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // Nothing to do, and nothing worth breaking a turn over.
  }
}

// Persisting is best effort by design. This runs on a turn boundary in the middle of a conversation, and
// a storage failure must cost the transcript rather than the turn.
export function writeSavedChat(chat: SavedChat): void {
  const store = storage();
  if (!store) return;

  const attempts = [MAX_SERIALIZED_CHARS, Math.floor(MAX_SERIALIZED_CHARS / 4)];
  for (const budget of attempts) {
    try {
      store.setItem(
        CHAT_STORAGE_KEY,
        serializeChat({ events: trimToBudget(chat.events, budget), session: chat.session }),
      );
      return;
    } catch {
      // Almost always QuotaExceededError, and almost always because another origin key grew rather than
      // this one. Retry once against a quarter of the budget before giving up.
    }
  }

  // Out of room even trimmed. Remove the key rather than leaving whatever was there before, which would
  // restore a transcript that no longer matches the session cursor we were trying to update.
  clearSavedChat();
}

// The cursor alone, merged over whatever transcript is already stored.
//
// Called when eve advances the session, which happens at the turn boundary before the final snapshot is
// available. Saving it early is what lets a refresh moments after a reply still continue the same durable
// session instead of orphaning it.
//
// Only ever written with a continuation token present. A cursor holding a session id but no token is the
// shape eve reports for an accepted, still in-flight turn, and sending against it would be rejected: the
// continue route requires the token. Skipping the write leaves the last usable cursor in place.
export function saveSessionCursor(session: SessionState): void {
  if (!session.continuationToken) return;
  writeSavedChat({ events: readSavedChat()?.events ?? [], session });
}
