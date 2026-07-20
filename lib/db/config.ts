import type { PoolConfig } from "pg";

// Builds a pg pool config that connects to a managed Postgres (RDS) over TLS. node-postgres treats a
// connection string's `sslmode=require` as full CA verification, which rejects RDS's own certificate
// chain, so we strip that param and manage TLS through the ssl option instead. Local dev Postgres
// runs without TLS. Production hardening would pin the RDS CA bundle here rather than skip verify.
export function pgPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    max: 4,
    // A hung connect is the same failure class as a hung Vault call: it turns a brief into a
    // request that never returns rather than an error anyone can act on.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}
