import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Route protection. Next 16 renamed the middleware convention to proxy, and this runs before any page
// renders, so an unauthenticated request never reaches a server component that would otherwise query
// the warehouse before discovering it should not have.
//
// This only checks that a cookie is present. It deliberately does not verify the signature: the proxy
// is a redirect, not the security boundary, and doing crypto here would put the signing key on a path
// that Vercel may run at the edge. Verification happens where it matters, in the server components via
// getCaller() and in the eve auth walk, both of which fail closed on a forged cookie. A forged cookie
// gets you as far as a page that then treats you as anonymous.
//
// The public set is deliberate: the landing page and the health endpoint must stay reachable so a
// reviewer can confirm the boundary is real before signing in as anybody.

export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)) return NextResponse.next();

  const signin = new URL("/signin", request.url);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/dashboard/:path*", "/board/:path*", "/accounts/:path*", "/chat/:path*", "/spend/:path*"],
};
