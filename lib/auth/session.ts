// The signed session cookie. An HS256 JWT carrying just enough to answer "who is asking and which
// book of accounts is theirs", with no server-side session store to keep in sync.
//
// Signed with Web Crypto rather than a JWT library on purpose. `jose` is present in node_modules but
// only as a transitive dependency of another package, so importing it directly would couple this file
// to somebody else's dependency tree and break quietly the day that package drops it. HMAC-SHA256 over
// two base64url segments is small enough to own, and it runs unchanged in the proxy, in server
// components, and in the eve auth walk.
//
// The JWT shape is deliberate even though a bare signed payload would do: it is the same shape eve's
// own jwtHmac() verifier expects, so moving verification into the framework later is a swap, not a
// rewrite.

import { type Persona, findPersona } from "./personas";

export const SESSION_COOKIE = "steve_session";

const ALG = "HS256";
const TTL_SECONDS = 60 * 60 * 12;

export type SessionClaims = {
  sub: string;
  name: string;
  seOwner: string | null;
  role: Persona["role"];
  iat: number;
  exp: number;
};

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Returns a view backed by a plain ArrayBuffer. Uint8Array.from would do, but its type carries
// ArrayBufferLike, which Web Crypto's BufferSource will not accept.
function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function secret(): string {
  const configured = process.env.AUTH_SESSION_SECRET;
  if (configured) return configured;
  // Deployed without a secret is a misconfiguration, not something to paper over with a default: a
  // predictable signing key would let anyone mint a leadership session. Local dev gets a fixed key so
  // a fresh clone runs with no setup, and that key is worthless off localhost because nothing else
  // trusts it.
  if (process.env.VERCEL) {
    throw new Error("AUTH_SESSION_SECRET is not set");
  }
  return "steve-local-development-only";
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(persona: Persona, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  const claims: SessionClaims = {
    sub: persona.id,
    name: persona.name,
    seOwner: persona.seOwner,
    role: persona.role,
    iat: issuedAt,
    exp: issuedAt + TTL_SECONDS,
  };
  const encoder = new TextEncoder();
  const header = b64urlEncode(encoder.encode(JSON.stringify({ alg: ALG, typ: "JWT" })));
  const payload = b64urlEncode(encoder.encode(JSON.stringify(claims)));
  const body = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(signature))}`;
}

// Pulls our cookie out of a raw Cookie header. Written by hand because the callers that need it are a
// plain Request in the eve auth walk and a Next request in the proxy, and only one of those has a
// cookie jar.
export function sessionCookieFrom(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

// Returns null for anything that is not a currently valid token. Callers treat null as anonymous, so
// a tampered token and a missing one take the same path and neither leaks why it failed.
export async function verifySession(token: string | undefined, now = Date.now()): Promise<SessionClaims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const encoder = new TextEncoder();
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      b64urlDecode(signature),
      encoder.encode(`${header}.${payload}`),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as SessionClaims;
  } catch {
    return null;
  }

  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return null;
  // The signature proves the claims were minted here, but the persona list is the source of truth for
  // what a subject may see. Re-resolving means removing a persona revokes its live sessions rather
  // than leaving them valid until they expire.
  if (!findPersona(claims.sub)) return null;

  return claims;
}
