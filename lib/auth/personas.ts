// The people Steve answers to. A book of accounts belongs to an SE, so who is asking decides which
// accounts are readable at all, and the demo needs that to be visible rather than asserted.
//
// These are fixtures, not a user store. The take-home asks for test credentials a reviewer can use in
// seconds, and a picker with no passwords is faster than issuing logins. In production this list is
// replaced by the identity provider: `seOwner` comes from an Okta group claim and `id` from the OIDC
// subject. Nothing else about the authorization path changes, which is the point of keeping the
// persona shape this thin.

export type PersonaRole = "se" | "leadership";

export type Persona = {
  id: string;
  name: string;
  email: string;
  // Matches activity.dim_account.se_owner. Null means the caller is not scoped to one book, which is
  // how leadership sees every account without a second code path.
  seOwner: string | null;
  role: PersonaRole;
  blurb: string;
};

export const PERSONAS: readonly Persona[] = [
  {
    id: "jordan-okafor",
    name: "Jordan Okafor",
    email: "jordan.okafor@example.com",
    seOwner: "J. Okafor",
    role: "se",
    blurb: "Carries Northwind, the churn-risk account, and Lumen, the legacy migration.",
  },
  {
    id: "priya-raman",
    name: "Priya Raman",
    email: "priya.raman@example.com",
    seOwner: "P. Raman",
    role: "se",
    blurb: "A stalled evaluation and a new logo still ramping.",
  },
  {
    id: "mateo-alvarez",
    name: "Mateo Alvarez",
    email: "mateo.alvarez@example.com",
    seOwner: "M. Alvarez",
    role: "se",
    blurb: "A renewal under commercial pressure.",
  },
  {
    id: "se-leadership",
    name: "SE leadership",
    email: "se-leadership@example.com",
    seOwner: null,
    role: "leadership",
    blurb: "Every account, for the cross-book view.",
  },
];

export function findPersona(id: string): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
