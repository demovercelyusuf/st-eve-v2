import process from "node:process";
import { getWarehouseCreds } from "../lib/vault/creds";
import { getAccountActivity } from "../lib/warehouse/repository";

// Proves the copilot reads the warehouse with Vault-minted, short-lived credentials. Run with
// VAULT_ADDR, an auth (VAULT_DEV_TOKEN locally, or VERCEL_OIDC_TOKEN for the JWT flow), and
// VAULT_WAREHOUSE_HOST / VAULT_WAREHOUSE_DB set to the warehouse.

async function main() {
  const creds = await getWarehouseCreds();
  console.log("Vault minted a short-lived warehouse role:");
  console.log(`  username: ${creds.username}`);
  console.log(`  ttl:      ${creds.ttlSeconds}s   lease: ${creds.leaseId}`);

  const activity = await getAccountActivity("ACC-2041");
  console.log(`\nRead Northwind's warehouse activity through Vault creds: ${activity.length} rows`);
  console.log("No standing warehouse password was used.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
