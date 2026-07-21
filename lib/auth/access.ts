// Where "what did they mean" meets "may they see it". The repository resolves names, scope.ts decides
// entitlement, and this is the one place the two are composed. Every read path, the web surface and
// every agent tool alike, goes through resolveAccountForCaller, so there is a single function to audit
// when someone asks how the boundary is enforced.
//
// Scoping only the pages was the tempting shortcut and it is the wrong one: the agent has its own
// route into the same data, so an SE could be shown four accounts and still ask the copilot about the
// fifth. A filter the model can talk around is not a boundary.

import { type AccountRef, findAccount } from "../warehouse/repository";
import { type Caller, canSeeOwner } from "./scope";

export type AccountResolution =
  | { ok: true; account: AccountRef }
  | { ok: false; reason: "unknown"; query: string }
  | { ok: false; reason: "out-of-scope"; query: string; owner: string };

export async function resolveAccountForCaller(
  caller: Caller,
  query: string,
): Promise<AccountResolution> {
  const account = await findAccount(query);
  if (!account) return { ok: false, reason: "unknown", query };
  if (!canSeeOwner(caller, account.seOwner)) {
    return { ok: false, reason: "out-of-scope", query, owner: account.seOwner };
  }
  return { ok: true, account };
}

// The sentence a tool hands back to the model when a read is refused. Naming the real owner is a
// deliberate choice: inside one company, "that account belongs to someone else" is more useful than
// "no such account", and it stops the model retrying a lookup that will never succeed.
export function explainRefusal(resolution: Extract<AccountResolution, { ok: false }>): string {
  if (resolution.reason === "unknown") {
    return `No account matches "${resolution.query}".`;
  }
  return `"${resolution.query}" is owned by ${resolution.owner} and is not on your patch. Ask them, or ask someone with a cross-patch view.`;
}
