import { describe, expect, it } from "vitest";
import { BRIEF_MODEL, FAST_MODEL, modelForMessage } from "./config";

// Routing is by intent rather than by step, because the four model steps in a brief are wildly uneven
// and the expensive one is also the one where quality matters most. These cases pin the asymmetry:
// guessing "brief" costs a fraction of a cent, guessing "fast" costs a visibly worse artifact in
// front of whoever asked.

describe("model routing", () => {
  it("sends brief requests to the stronger model", () => {
    for (const message of [
      "brief me on Northwind",
      "Give me a brief on Northwind.",
      "summarise Atlas Manufacturing",
      "write up where Cobalt Sky stands",
      "status on Helios",
      "catch me up on Foundry Labs",
    ]) {
      expect(modelForMessage(message), message).toBe(BRIEF_MODEL);
    }
  });

  it("sends follow-ups to the fast model", () => {
    for (const message of [
      "why is that risky?",
      "who is the champion there",
      "show me the evidence for the second one",
      "which of my accounts is worst",
    ]) {
      expect(modelForMessage(message), message).toBe(FAST_MODEL);
    }
  });

  it("guesses brief when there is nothing to go on", () => {
    // The asymmetry again: an empty or whitespace message resolves to the stronger model, because
    // being wrong in that direction only costs money.
    expect(modelForMessage(undefined)).toBe(BRIEF_MODEL);
    expect(modelForMessage("")).toBe(BRIEF_MODEL);
    expect(modelForMessage("   ")).toBe(BRIEF_MODEL);
  });

  it("routes on intent, not on the account being named", () => {
    // "Northwind" appears in both, so a naive contains-an-account-name rule would misroute one.
    expect(modelForMessage("brief Northwind")).toBe(BRIEF_MODEL);
    expect(modelForMessage("is Northwind still blocked on the failover bug?")).toBe(FAST_MODEL);
  });
});
