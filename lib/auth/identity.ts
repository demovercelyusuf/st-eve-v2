// The operator. Steve is single tenant: one Solutions Engineer, one book of accounts, no sign-in.
//
// There was a persona picker here. It went because it answered a question nobody was asking: the demo
// is one SE looking at their own patch, and making a reviewer choose an identity first put a decision
// in front of them before they had seen anything worth deciding about.
//
// The identity itself stays, and it is not ceremony. Vercel Connect mints user-subject tokens, and
// Linear is read with one, so a token cannot be requested without a principal to attach it to.
// This is that principal. In production it arrives from Okta through eve's oidc() authenticator and
// the id becomes the OIDC subject; nothing downstream changes, because everything downstream only
// ever reads these three fields.

export type Operator = {
  id: string;
  name: string;
  email: string;
};

export const OPERATOR: Operator = {
  id: "yusuf",
  name: "Yusuf",
  email: "yusuf@vantage.example.com",
};
