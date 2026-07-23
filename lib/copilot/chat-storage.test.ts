import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import { describe, expect, it } from "vitest";
import { deserializeChat, serializeChat, trimToBudget } from "./chat-storage";

// The serialize and trim halves are pure, so they are tested directly without a DOM. The thin
// localStorage wrappers around them hold no logic worth pinning.

// eve's stream event is a union of twenty-odd shapes and the module only ever reads `type`, so a test
// fixture states that much and nothing more.
function event(type: string, payload: Record<string, unknown> = {}): HandleMessageStreamEvent {
  return { type, ...payload } as unknown as HandleMessageStreamEvent;
}

const SESSION: SessionState = {
  continuationToken: "eve:eve:6f1c0f1e-0b4a-4c53-9a2e-1d7f6b9c1a20",
  sessionId: "wrun_01KY2SWYR4FQ3TSDWP8CAARFVE",
  streamIndex: 42,
};

describe("serializeChat and deserializeChat", () => {
  it("round-trips events and the full session cursor", () => {
    const events = [event("turn.started"), event("message.appended", { text: "Seats fell to 96." })];

    const restored = deserializeChat(serializeChat({ events, session: SESSION }));

    expect(restored?.events).toEqual(events);
    // All three fields, not just the token. The session id is what keeps the evidence ledger resolving
    // after a reload, and the stream index is what stops the client replaying what it already has.
    expect(restored?.session).toEqual(SESSION);
  });

  it("reads back a cursor that has no session id yet", () => {
    const session: SessionState = { streamIndex: 0 };

    const restored = deserializeChat(serializeChat({ events: [], session }));

    expect(restored?.session).toEqual(session);
  });

  it("returns null when nothing is stored", () => {
    expect(deserializeChat(null)).toBeNull();
    expect(deserializeChat("")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(deserializeChat("{ not json")).toBeNull();
  });

  it("discards a value written by a different schema version", () => {
    const stale = JSON.stringify({ version: 0, events: [], session: SESSION });

    expect(deserializeChat(stale)).toBeNull();
  });

  it("discards a value whose events are not an array", () => {
    const broken = JSON.stringify({ version: 1, events: { 0: event("turn.started") }, session: SESSION });

    expect(deserializeChat(broken)).toBeNull();
  });

  it("discards a value carrying an event with no type", () => {
    const broken = JSON.stringify({ version: 1, events: [{ text: "orphaned" }], session: SESSION });

    expect(deserializeChat(broken)).toBeNull();
  });

  it("discards a value whose session is not a cursor", () => {
    const broken = JSON.stringify({ version: 1, events: [], session: { sessionId: "wrun_1" } });

    expect(deserializeChat(broken)).toBeNull();
  });
});

describe("trimToBudget", () => {
  const pad = (size: number) => "x".repeat(size);

  it("returns the log untouched when it already fits", () => {
    const events = [event("turn.started"), event("message.appended", { text: "short" })];

    expect(trimToBudget(events, 10_000)).toBe(events);
  });

  it("drops the oldest whole turn to get under budget", () => {
    const events = [
      event("turn.started", { turnId: "t1" }),
      event("message.appended", { text: pad(4_000) }),
      event("session.waiting"),
      event("turn.started", { turnId: "t2" }),
      event("message.appended", { text: "recent" }),
    ];

    const trimmed = trimToBudget(events, 1_000);

    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]).toMatchObject({ type: "turn.started", turnId: "t2" });
  });

  it("never returns a log that begins midway through a turn", () => {
    const events = [
      event("turn.started", { turnId: "t1" }),
      event("message.appended", { text: pad(4_000) }),
      event("turn.started", { turnId: "t2" }),
      event("message.appended", { text: pad(4_000) }),
      event("turn.started", { turnId: "t3" }),
      event("message.appended", { text: "recent" }),
    ];

    const trimmed = trimToBudget(events, 1_000);

    // A cut anywhere else would leave the reducer projecting a message whose opening it never saw.
    expect(trimmed[0]).toMatchObject({ type: "turn.started" });
  });

  it("keeps as much history as the budget allows", () => {
    const events = [
      event("turn.started", { turnId: "t1" }),
      event("message.appended", { text: pad(2_000) }),
      event("turn.started", { turnId: "t2" }),
      event("message.appended", { text: "small" }),
      event("turn.started", { turnId: "t3" }),
      event("message.appended", { text: "small" }),
    ];

    const trimmed = trimToBudget(events, 500);

    // t2 and t3 both fit, so the older of the two survives rather than only the last.
    expect(trimmed[0]).toMatchObject({ type: "turn.started", turnId: "t2" });
    expect(trimmed).toHaveLength(4);
  });

  it("gives up rather than returning an oversized log when one turn exceeds the budget", () => {
    const events = [event("turn.started"), event("message.appended", { text: pad(4_000) })];

    expect(trimToBudget(events, 1_000)).toEqual([]);
  });

  it("gives up when the log has no turn boundary to cut at", () => {
    const events = [event("message.appended", { text: pad(4_000) })];

    expect(trimToBudget(events, 1_000)).toEqual([]);
  });
});
