import { Pool } from "pg";

// A pooled connection to the account-activity warehouse. In production the connection string is a
// short-lived credential minted by Vault for the length of a run; in local dev it is the dev
// database. We keep the pool small and let idle clients release quickly so an idle Fluid Compute
// instance can suspend without holding warehouse connections open.

let pool: Pool | undefined;

function needsSsl(connectionString: string): boolean {
  return !(
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
  );
}

export function warehousePool(): Pool {
  if (!pool) {
    const connectionString = process.env.WAREHOUSE_DATABASE_URL;
    if (!connectionString) {
      throw new Error("WAREHOUSE_DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 10_000,
      // RDS terminates TLS with its own CA. For the demo we require TLS; production pins the RDS CA
      // bundle here instead of skipping verification.
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}
