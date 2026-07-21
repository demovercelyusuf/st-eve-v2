// Linear's half of the account picture: the engineering work raised against an account during a
// pilot or an evaluation. Blockers, defects and feature asks, which is the part of the technical
// story that never reaches the CRM.
//
// Kept out of the tool file so the query and the shaping can be read and changed without eve in the
// way, the same split the Salesforce adapter uses.

const LINEAR_API = "https://api.linear.app/graphql";

// The connector id, named here rather than in the tool because two callers now need it: the agent's
// read tool during a brief, and the account page reading the same issues for the evidence timeline.
// A second literal in the page file would be the kind of duplication that survives a connector rename
// by silently failing on one surface only.
export const LINEAR_CONNECTOR = "linear/byzantine-pebble";

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

// The list view's read: one open-issue count per account across the whole patch.
//
// A different question from fetchAccountIssues, and the difference is why it is a separate query
// rather than a loop over that one. The per-account read answers "what is the engineering story
// here" and its rows get cited. This answers "which of my accounts is carrying weight" and its rows
// get scanned, so it trades every field except the label for a single round trip. Looping would put
// one request per row on a dashboard render, which is the version that gets written first and
// regretted on the first patch with thirty accounts.
//
// Open is defined by state type rather than state name: an org can rename "Done" but the completed
// and canceled types are Linear's own, so this survives a workflow rename.
const OPEN_COUNT_QUERY = `
  query PatchIssueLoad($labels: [String!], $first: Int!) {
    issues(
      filter: {
        labels: { name: { in: $labels } }
        state: { type: { nin: ["completed", "canceled"] } }
      }
      first: $first
    ) {
      pageInfo { hasNextPage }
      nodes { labels { nodes { name } } }
    }
  }
`;

export type OpenIssueCounts = {
  openByAccount: Record<string, number>;
  // False when the page cap truncated the result, which makes every count a floor rather than a
  // total. Surfaced instead of hidden because "4 open issues" and "at least 4 open issues" are
  // different claims and only one of them is true here.
  complete: boolean;
};

// Enough to cover this workspace many times over. A cap rather than a paging loop because the honest
// failure is "these are floors", which `complete` already says, and pagination would put an unbounded
// number of round trips behind a page render.
const OPEN_COUNT_CAP = 250;

export async function fetchOpenIssueCounts(
  token: string,
  labels: string[],
  signal?: AbortSignal,
): Promise<OpenIssueCounts> {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: JSON.stringify({
      query: OPEN_COUNT_QUERY,
      variables: { labels, first: OPEN_COUNT_CAP },
    }),
    signal,
  });

  if (res.status === 401 || res.status === 403) {
    throw new LinearUnauthorized(`linear rejected the token: ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`linear request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data?: {
      issues?: {
        pageInfo?: { hasNextPage?: boolean };
        nodes?: Array<{ labels?: { nodes?: Array<{ name?: string }> } }>;
      };
    };
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(`linear query failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  // Counted against the labels we asked for, not against every label the issue carries. Issues also
  // carry component and severity labels, and bucketing those would invent accounts that do not exist.
  const wanted = new Set(labels);
  const openByAccount: Record<string, number> = {};
  for (const node of json.data?.issues?.nodes ?? []) {
    for (const label of node.labels?.nodes ?? []) {
      if (label.name && wanted.has(label.name)) {
        openByAccount[label.name] = (openByAccount[label.name] ?? 0) + 1;
      }
    }
  }

  return { openByAccount, complete: json.data?.issues?.pageInfo?.hasNextPage !== true };
}
