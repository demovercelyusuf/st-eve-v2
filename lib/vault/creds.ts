// Obtains short-lived warehouse credentials from Vault. In production the copilot authenticates to
// Vault with its Vercel OIDC token (JWT auth method), then reads a dynamic read-only Postgres role
// from the database secrets engine. No standing warehouse password ever lives in the app: every
// credential is leased, least-privilege, and auto-expiring.

export type WarehouseCreds = {
  username: string;
  password: string;
  leaseId: string;
  ttlSeconds: number;
};

// Resolve a Vault token. Local dev can pass VAULT_TOKEN directly; production exchanges the Vercel
// OIDC token through the JWT auth method, so the app never holds a long-lived Vault token either.
async function vaultToken(addr: string): Promise<string> {
  const direct = process.env.VAULT_TOKEN;
  if (direct) return direct;

  const oidc = process.env.VERCEL_OIDC_TOKEN;
  if (!oidc) {
    throw new Error("Vault auth needs VAULT_TOKEN or a VERCEL_OIDC_TOKEN to exchange");
  }
  const role = process.env.VAULT_JWT_ROLE ?? "vantage-copilot";
  const res = await fetch(`${addr}/v1/auth/jwt/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, jwt: oidc }),
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
    headers: { "x-vault-token": token },
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
