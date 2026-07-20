// Who is asking, and which accounts that entitles them to. This is the only place that answers the
// second question, because the web surface and the agent must answer it the same way. Scoping only the
// pages would mean an SE could not see an account in the UI but could still ask the copilot about it,
// and a filter the model can talk its way around is not a boundary.
//
// Kept free of next/headers and of eve so it stays a pure function of its inputs and can be tested
// without a request or a session. lib/auth/server.ts adapts the cookie, agent/tools adapt eve's
// session auth, and both land here.

import { type Persona, findPersona } from "./personas";
import type { SessionClaims } from "./session";

export type Caller = {
  id: string;
  name: string;
  // Null means unscoped. Leadership reads every account, which is a real answer rather than a bypass:
  // the scope is still evaluated, it just resolves to no restriction.
  seOwner: string | null;
  role: Persona["role"];
};

export function callerFromClaims(claims: SessionClaims): Caller {
  return { id: claims.sub, name: claims.name, seOwner: claims.seOwner, role: claims.role };
}

// eve carries auth attributes as a string map, so an unscoped caller omits seOwner rather than
// encoding null into it. Anything we do not recognise returns null and is treated as anonymous.
export function callerFromAttributes(
  principalId: string | undefined,
  attributes: Readonly<Record<string, string | readonly string[]>> | undefined,
): Caller | null {
  if (!principalId) return null;
  const persona = findPersona(principalId);
  // The attributes ride along for debugging and for the run trace, but the persona list is what
  // decides the book. Trusting the attribute would let a stale session keep a scope that has since
  // been changed or removed.
  if (!persona) return null;
  void attributes;
  return { id: persona.id, name: persona.name, seOwner: persona.seOwner, role: persona.role };
}

// The shape of what a tool receives, described structurally rather than imported from eve. lib/ stays
// free of framework imports so the grounding and authorization logic remains portable, which is the
// same reason lib/grounding/gate.ts takes a plain Set instead of a session.
export type SessionLike = {
  readonly auth: {
    readonly current: {
      readonly principalId: string;
      readonly principalType: string;
      readonly attributes: Readonly<Record<string, string | readonly string[]>>;
    } | null;
  };
};

// A turn with no authenticated principal has no book of accounts, so it reads nothing. Failing closed
// matters more here than anywhere else in the app: this is the path an anonymous chat request takes.
export function callerFromSession(session: SessionLike | undefined): Caller | null {
  const current = session?.auth?.current;
  if (!current || current.principalType !== "user") return null;
  return callerFromAttributes(current.principalId, current.attributes);
}

export function callerAttributes(caller: Caller): Record<string, string> {
  const attributes: Record<string, string> = { role: caller.role };
  if (caller.seOwner) attributes.seOwner = caller.seOwner;
  return attributes;
}

export function canSeeOwner(caller: Caller, seOwner: string | null): boolean {
  if (caller.seOwner === null) return true;
  return seOwner === caller.seOwner;
}

// The scope as the repository wants it: null means no predicate, a string means one. Returning this
// rather than a SQL fragment keeps the query text in the repository where the rest of it lives, and
// keeps this module free of anything database shaped.
export function ownerFilter(caller: Caller): string | null {
  return caller.seOwner;
}

export class OutOfScopeError extends Error {
  constructor(readonly accountRef: string) {
    super(`"${accountRef}" is not in your book of accounts.`);
    this.name = "OutOfScopeError";
  }
}
