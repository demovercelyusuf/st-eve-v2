import { type Caller, callerFor } from "./scope";

// The web surface's view of who is asking. Steve is single tenant, so this resolves to the operator
// without a cookie, a session store or a login screen.
//
// It is still a function rather than an imported constant, and deliberately async, because that is the
// seam. When identity comes from Okta this reads the verified claims and returns null for an
// unauthenticated request; every caller already awaits it and already handles null, so the multi-user
// path is a change inside this file rather than a change to every page.
export async function getCaller(): Promise<Caller | null> {
  return callerFor();
}
