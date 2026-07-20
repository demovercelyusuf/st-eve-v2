import { describe, expect, it } from "vitest";
import { PERSONAS, findPersona } from "./personas";
import { callerFromAttributes, canSeeOwner, callerFromClaims, ownerFilter } from "./scope";
import { signSession, verifySession } from "./session";

// The session is the only thing standing between a reviewer clicking a persona and Steve reading an
// account, so these cases are about what must NOT verify as much as what must.

const okafor = findPersona("jordan-okafor")!;
const leadership = findPersona("se-leadership")!;

describe("session token", () => {
  it("round trips the persona it was minted for", async () => {
    const claims = await verifySession(await signSession(okafor));
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe("jordan-okafor");
    expect(claims!.seOwner).toBe("J. Okafor");
    expect(claims!.role).toBe("se");
  });

  it("rejects a token with a tampered payload", async () => {
    const token = await signSession(okafor);
    const [header, , signature] = token.split(".");
    // Re-encode a payload that claims leadership, keeping the original signature.
    const forged = btoa(JSON.stringify({ ...(await verifySession(token))!, seOwner: null, role: "leadership" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a malformed token", async () => {
    expect(await verifySession("not-a-token")).toBeNull();
    expect(await verifySession("a.b")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const issued = Date.now();
    const token = await signSession(okafor, issued);
    const thirteenHoursLater = issued + 13 * 60 * 60 * 1000;
    expect(await verifySession(token, thirteenHoursLater)).toBeNull();
  });

  it("rejects a validly signed token whose persona no longer exists", async () => {
    // Signed by us, so the signature checks out, but the subject resolves to nobody. Removing a
    // persona has to revoke its live sessions rather than leave them good until they expire.
    const ghost = { ...okafor, id: "someone-who-left" };
    expect(await verifySession(await signSession(ghost))).toBeNull();
  });
});

describe("scope", () => {
  it("confines an SE to their own book", () => {
    const caller = callerFromClaims({
      sub: "jordan-okafor",
      name: "Jordan Okafor",
      seOwner: "J. Okafor",
      role: "se",
      iat: 0,
      exp: 0,
    });
    expect(canSeeOwner(caller, "J. Okafor")).toBe(true);
    expect(canSeeOwner(caller, "P. Raman")).toBe(false);
    expect(ownerFilter(caller)).toBe("J. Okafor");
  });

  it("leaves leadership unfiltered", () => {
    const caller = callerFromClaims({ sub: "se-leadership", name: "SE leadership", seOwner: null, role: "leadership", iat: 0, exp: 0 });
    expect(canSeeOwner(caller, "J. Okafor")).toBe(true);
    expect(canSeeOwner(caller, "M. Alvarez")).toBe(true);
    expect(ownerFilter(caller)).toBeNull();
  });

  it("resolves an eve principal back to its persona and ignores claimed attributes", () => {
    // The attribute says leadership; the persona list says otherwise, and the persona list wins.
    const caller = callerFromAttributes("jordan-okafor", { role: "leadership" });
    expect(caller).not.toBeNull();
    expect(caller!.seOwner).toBe("J. Okafor");
    expect(caller!.role).toBe("se");
  });

  it("treats an unknown principal as anonymous", () => {
    expect(callerFromAttributes("nobody", {})).toBeNull();
    expect(callerFromAttributes(undefined, {})).toBeNull();
  });

  it("covers every persona in the picker", () => {
    expect(PERSONAS.map((p) => p.id)).toContain(leadership.id);
    expect(PERSONAS.filter((p) => p.role === "se")).toHaveLength(3);
  });
});
