import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { callerAttributes, callerFromClaims } from "../../lib/auth/scope";
import { sessionCookieFrom, verifySession } from "../../lib/auth/session";

// Who may reach the agent over HTTP. This used to be none(), which was survivable while the copilot
// read one fixed patch, and is not survivable now: the agent reads whatever the caller's book of
// accounts contains, so an anonymous turn would have to mean either "every account" or "no account"
// and neither is an honest answer.
//
// appSession() goes first so a signed-in browser resolves to a real person. That principal is what the
// tools scope on, and it is also what Vercel Connect needs, since a user-subject token cannot be
// minted without one. So this is not only the front door, it is what lets Steve reach Notion at all.
//
// vercelOidc() sits behind it for runtime and subagent callers, and localDev() last so a loopback
// request still works without a cookie. Anything the walk does not recognise falls through to a 401,
// which is eve's default and the behaviour we want.
function appSession(): AuthFn<Request> {
  return async (request) => {
    const claims = await verifySession(sessionCookieFrom(request.headers.get("cookie")));
    if (!claims) return null;

    const caller = callerFromClaims(claims);
    return {
      attributes: callerAttributes(caller),
      authenticator: "app-session",
      principalId: caller.id,
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [appSession(), vercelOidc(), localDev()],
});
