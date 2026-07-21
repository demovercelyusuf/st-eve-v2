// Who is asking, and what that entitles them to read. Steve is single tenant, so today the answer is
// "the operator, and everything", and this module exists to keep that answer in one place rather than
// assumed in ten.
//
// That is not busywork. The moment a second reader exists, whether that is a second SE or an Okta
// group claim, the entitlement question has one home to change instead of being rediscovered in every
// query and every tool. The read paths already call through here, so that change stays local.
//
// Kept free of next/headers and of eve so it is a pure function of its inputs and can be tested
// without a request or a session, the same reason lib/grounding/gate.ts takes a plain Set.

import { OPERATOR, type Operator } from "./identity";

export type Caller = {
  id: string;
  name: string;
  // Null means unscoped. The operator reads every account, and that is expressed as "no restriction"
  // rather than as a bypass, so the scope is still evaluated on every read and there is exactly one
  // code path to audit.
  seOwner: string | null;
};

export function callerFor(operator: Operator = OPERATOR): Caller {
  return { id: operator.id, name: operator.name, seOwner: null };
}

// The shape of what a tool receives, described structurally rather than imported from eve. lib/ stays
// free of framework imports so the grounding and authorization logic remains portable.
export type SessionLike = {
  readonly auth: {
    readonly current: {
      readonly principalId: string;
      readonly principalType: string;
      readonly attributes: Readonly<Record<string, string | readonly string[]>>;
    } | null;
  };
};

// A turn with no authenticated principal reads nothing. That matters even with one operator: it is
// the difference between "the agent runs as somebody" and "the agent runs as whoever reached it", and
// only the first can request a Connect token.
export function callerFromSession(session: SessionLike | undefined): Caller | null {
  const current = session?.auth?.current;
  if (!current || current.principalType !== "user") return null;
  if (current.principalId !== OPERATOR.id) return null;
  return callerFor();
}

export function callerAttributes(caller: Caller): Record<string, string> {
  return caller.seOwner ? { seOwner: caller.seOwner } : {};
}

export function canSeeOwner(caller: Caller, seOwner: string | null): boolean {
  if (caller.seOwner === null) return true;
  return seOwner === caller.seOwner;
}

// The scope as the repository wants it: null means no predicate. Returning this rather than a SQL
// fragment keeps the query text in the repository and keeps this module free of anything database
// shaped.
export function ownerFilter(caller: Caller): string | null {
  return caller.seOwner;
}
