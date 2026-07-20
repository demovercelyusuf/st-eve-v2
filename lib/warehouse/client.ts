import { Pool } from "pg";
import { pgPoolConfig } from "../db/config";
import { getWarehouseCreds } from "../vault/creds";

// A pooled connection to the account-activity warehouse. When Vault is configured (VAULT_ADDR is
// set), the pool is built from short-lived credentials Vault mints for the warehouse role, so no
// standing warehouse password lives in the app. Otherwise it connects with WAREHOUSE_DATABASE_URL
// directly (local dev against the dev database). Either way the pool stays small and releases idle
// clients quickly so an idle Fluid Compute instance holds no warehouse connections open.

let pool: Pool | undefined;

async function warehouseConnectionString(): Promise<string> {
  if (process.env.VAULT_ADDR) {
    const creds = await getWarehouseCreds();
    const host = process.env.VAULT_WAREHOUSE_HOST;
    const db = process.env.VAULT_WAREHOUSE_DB ?? "warehouse";
    if (!host) throw new Error("VAULT_WAREHOUSE_HOST is not set");
    return `postgresql://${creds.username}:${encodeURIComponent(creds.password)}@${host}:5432/${db}`;
  }
  const url = process.env.WAREHOUSE_DATABASE_URL;
  if (!url) throw new Error("WAREHOUSE_DATABASE_URL is not set");
  return url;
}

export async function getWarehousePool(): Promise<Pool> {
  if (!pool) {
    pool = new Pool(pgPoolConfig(await warehouseConnectionString()));
  }
  return pool;
}
