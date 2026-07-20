import { none } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

export default eveChannel({
  // Public at the app layer so the built-in chat works without a login. The deployment sits behind
  // Vercel Deployment Protection (one password) for the demo, and behind the customer's Okta SSO in
  // production; the copilot never runs anonymously there.
  auth: [none()],
});
