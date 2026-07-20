import { cookies } from "next/headers";
import { type Caller, callerFromClaims } from "./scope";
import { SESSION_COOKIE, signSession, verifySession } from "./session";
import { type Persona } from "./personas";

// The web surface's half of the session. Kept apart from session.ts because this half imports
// next/headers, and session.ts is also used by the eve auth walk, where there is no Next request to
// read from.

export async function getCaller(): Promise<Caller | null> {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return claims ? callerFromClaims(claims) : null;
}

export async function signInAs(persona: Persona): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signSession(persona), {
    httpOnly: true,
    sameSite: "lax",
    secure: Boolean(process.env.VERCEL),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
