import { type AuthFn, localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { OPERATOR } from "../../lib/auth/identity";

// Who the agent runs as. Steve is single tenant, so every browser caller is the operator, and there
// is no sign-in step in front of the copilot.
//
// This is not the same as none(), and the difference is the whole reason it exists. none() means the
// turn has no principal at all, and Vercel Connect cannot mint a user-subject token without one, so
// Notion would be unreachable. Attaching a fixed principal keeps the agent usable by anyone who can
// reach the deployment while still giving the outbound credential path somebody to be.
//
// Say the tradeoff out loud rather than hiding it: this authenticates nobody. Anyone who can reach
// the URL can run a turn. That is acceptable for a single-tenant demo behind a URL nobody is given,
// and the production answer is one line, swapping operator() for oidc() against the customer's Okta,
// after which principalId is the OIDC subject and the rest of the walk is unchanged.
function operator(): AuthFn<Request> {
  return async () => ({
    attributes: {},
    authenticator: "operator",
    principalId: OPERATOR.id,
    principalType: "user",
  });
}

export default eveChannel({
  auth: [operator(), vercelOidc(), localDev()],
});
