import { getVercelOidcToken } from "@vercel/oidc";

// Obtains short-lived warehouse credentials from Vault. The copilot authenticates to Vault with its
// Vercel OIDC token (JWT auth method), then reads a dynamic read-only Postgres role from the
// database secrets engine. No standing warehouse password ever lives in the app, and no standing
// Vault token either: the only credential it holds is a platform-signed assertion of what it is,
// which it did not choose and cannot forge.

export type WarehouseCreds = {
  username: string;
  password: string;
  leaseId: string;
  ttlSeconds: number;
};

// Vault sits on the critical path of a read, so a slow Vault has to fail rather than hang. Neither
// call had a deadline before, which meant an unreachable cluster surfaced as a brief that never
// finished rather than as an error anyone could act on.
const VAULT_TIMEOUT_MS = 4_000;

// HCP Vault Dedicated puts every mount under the `admin` namespace, and without this header a call
// resolves against the root namespace and 404s, which looks exactly like "not configured yet".
//
// Sent only when configured, never defaulted. Namespaces are an Enterprise concept, so defaulting to
// `admin` would send the header to an OSS dev server too and break the local proof in scripts/
// check-vault.ts. Deployments that talk to HCP set VAULT_NAMESPACE explicitly.
function vaultHeaders(extra?: Record<string, string>): Record<string, string> {
  const namespace = process.env.VAULT_NAMESPACE;
  return {
    ...(namespace ? { "x-vault-namespace": namespace } : {}),
    ...extra,
  };
}

// Resolve a Vault token. Production exchanges the Vercel OIDC assertion through the JWT auth
// method, so the app never holds a long-lived Vault token.
//
// The dev escape hatch is gated on VERCEL_ENV being absent. It was previously an ungated read that
// ran first, which meant a value left behind in a Vercel environment would silently outrank the
// OIDC exchange and turn the whole path into dead code with nothing to indicate it had happened.
async function vaultToken(addr: string): Promise<string> {
  const devToken = process.env.VAULT_DEV_TOKEN;
  if (devToken && !process.env.VERCEL_ENV) return devToken;

  // Reads the token out of the Vercel request context. This works in route handlers and server
  // components, and it also works inside an eve tool. That second part is not obvious: tools run
  // outside Next's request scope, so next/headers throws there, but the workflow runtime carries
  // the Vercel request context into the step. Probing next/headers reports a false negative.
  const jwt = await getVercelOidcToken();
  const role = process.env.VAULT_JWT_ROLE ?? "steve-copilot";

  const res = await fetch(`${addr}/v1/auth/jwt/login`, {
    method: "POST",
    headers: vaultHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ role, jwt }),
    signal: AbortSignal.timeout(VAULT_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`vault jwt login failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { auth: { client_token: string } };
  return json.auth.client_token;
}

export async function getWarehouseCreds(): Promise<WarehouseCreds> {
  const addr = process.env.VAULT_ADDR;
  if (!addr) throw new Error("VAULT_ADDR is not set");
  const token = await vaultToken(addr);
  const role = process.env.VAULT_DB_ROLE ?? "warehouse-reader";

  const res = await fetch(`${addr}/v1/database/creds/${role}`, {
    headers: vaultHeaders({ "x-vault-token": token }),
    signal: AbortSignal.timeout(VAULT_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`vault creds read failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    lease_id: string;
    lease_duration: number;
    data: { username: string; password: string };
  };
  return {
    username: json.data.username,
    password: json.data.password,
    leaseId: json.lease_id,
    ttlSeconds: json.lease_duration,
  };
}

export function vaultConfigured(): boolean {
  return Boolean(process.env.VAULT_ADDR);
}
