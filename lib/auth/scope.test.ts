import { describe, expect, it } from "vitest";
import { OPERATOR } from "./identity";
import { callerFor, callerFromSession, canSeeOwner } from "./scope";

// Steve runs as one operator today, so most of these assert the unscoped case. They are worth keeping
// anyway: they pin the contract that a turn without a principal reads nothing, which is what stops
// the agent becoming a looser door onto the warehouse than the web surface is.

function session(current: { principalId: string; principalType: string } | null) {
  return { auth: { current: current ? { ...current, attributes: {} } : null } };
}

describe("caller", () => {
  it("resolves the operator as unscoped", () => {
    const caller = callerFor();
    expect(caller.id).toBe(OPERATOR.id);
    expect(caller.seOwner).toBeNull();
  });

  it("lets an unscoped caller see any owner", () => {
    const caller = callerFor();
    expect(canSeeOwner(caller, "Yusuf")).toBe(true);
    expect(canSeeOwner(caller, "someone else")).toBe(true);
    expect(canSeeOwner(caller, null)).toBe(true);
  });

  it("confines a scoped caller to its own book", () => {
    // No scoped caller exists yet. Asserting the branch anyway keeps the entitlement rule honest, so
    // that adding a second reader later is a data change rather than a logic change nobody tested.
    const scoped = { id: "someone", name: "Someone", seOwner: "P. Raman" };
    expect(canSeeOwner(scoped, "P. Raman")).toBe(true);
    expect(canSeeOwner(scoped, "Yusuf")).toBe(false);
    expect(scoped.seOwner).toBe("P. Raman");
  });
});

describe("session", () => {
  it("resolves the operator from a user principal", () => {
    expect(callerFromSession(session({ principalId: OPERATOR.id, principalType: "user" }))?.id).toBe(
      OPERATOR.id,
    );
  });

  it("reads nothing without a principal", () => {
    expect(callerFromSession(session(null))).toBeNull();
    expect(callerFromSession(undefined)).toBeNull();
  });

  it("rejects a non-user principal", () => {
    // A runtime or subagent caller authenticates, but it is not a person and has no book of accounts.
    expect(callerFromSession(session({ principalId: OPERATOR.id, principalType: "service" }))).toBeNull();
  });

  it("accepts a human under whatever name their channel gives them", () => {
    // Slack sends its own user id, Okta would send an OIDC subject, the web surface sends "yusuf".
    // Pinning one spelling meant Slack authenticated and then every tool refused with "sign in to see
    // your accounts", which is what happened on the first real mention.
    for (const principalId of ["yusuf", "U07QY751W14", "auth0|63f1c0d2"]) {
      expect(callerFromSession(session({ principalId, principalType: "user" }))?.id).toBe(OPERATOR.id);
    }
  });
});
