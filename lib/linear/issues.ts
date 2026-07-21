// Linear's half of the account picture: the engineering work raised against an account during a
// pilot or an evaluation. Blockers, defects and feature asks, which is the part of the technical
// story that never reaches the CRM.
//
// Kept out of the tool file so the query and the shaping can be read and changed without eve in the
// way, the same split the Salesforce adapter uses.

const LINEAR_API = "https://api.linear.app/graphql";

export type LinearIssue = {
  identifier: string;
  title: string;
  state: string;
  priority: number;
  url: string;
  updatedAt: string;
  description: string | null;
};

// One filterable query, not a traversal. Scoping by label is what keeps this bounded: the account
// scope lives in a where clause the model cannot influence, rather than in a prompt instruction it
// could be talked around.
const QUERY = `
  query AccountIssues($label: String!, $first: Int!) {
    issues(
      filter: { labels: { name: { eq: $label } } }
      orderBy: updatedAt
      first: $first
    ) {
      nodes {
        identifier
        title
        priority
        url
        updatedAt
        description
        state { name }
      }
    }
  }
`;

export class LinearUnauthorized extends Error {}

export async function fetchAccountIssues(
  token: string,
  label: string,
  first = 25,
): Promise<LinearIssue[]> {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { label, first } }),
  });

  // A 401 here means the grant is gone or expired, which the tool turns into a re-authorization
  // prompt rather than an error. Distinguished from other failures because only this one is fixable
  // by the person asking.
  if (res.status === 401 || res.status === 403) {
    throw new LinearUnauthorized(`linear rejected the token: ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`linear request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data?: { issues?: { nodes?: Array<Record<string, unknown>> } };
    errors?: Array<{ message: string }>;
  };
  // GraphQL reports errors in a 200, so a failed query looks like an empty result unless this is
  // checked. Silently returning no issues would read as "this account has no engineering work",
  // which is a claim the brief might then make.
  if (json.errors?.length) {
    throw new Error(`linear query failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  return (json.data?.issues?.nodes ?? []).map((n) => ({
    identifier: String(n.identifier),
    title: String(n.title),
    state: String((n.state as { name?: string } | undefined)?.name ?? "unknown"),
    priority: Number(n.priority ?? 0),
    url: String(n.url),
    updatedAt: String(n.updatedAt),
    description: n.description ? String(n.description) : null,
  }));
}

// The citable id. Namespaced rather than using Linear's bare identifier because a team could be named
// USG or ZD, and a bare USG-412 would collide with a usage id and resolve against the wrong source.
// The gate checks set membership, so it cannot detect a collision: the id would be present, just for
// the wrong reason.
export function linearCitationId(identifier: string): string {
  return `LIN-${identifier}`;
}
