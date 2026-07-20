import { Pool } from "pg";
import { pgPoolConfig } from "../db/config";

// A pooled connection to the account-activity warehouse. In production the connection string is a
// short-lived credential minted by Vault for the length of a run; in local dev it is the dev
// database. We keep the pool small and let idle clients release quickly so an idle Fluid Compute
// instance can suspend without holding warehouse connections open.

let pool: Pool | undefined;

export function warehousePool(): Pool {
  if (!pool) {
    const connectionString = process.env.WAREHOUSE_DATABASE_URL;
    if (!connectionString) {
      throw new Error("WAREHOUSE_DATABASE_URL is not set");
    }
    pool = new Pool(pgPoolConfig(connectionString));
  }
  return pool;
}
