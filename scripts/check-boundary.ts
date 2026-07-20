import process from "node:process";
import { getSalesforceAccount } from "../lib/salesforce/adapter";
import { getAccountActivity, listAccounts } from "../lib/warehouse/repository";

// A quick cross-boundary read check for local dev: lists accounts, then reads one account's
// activity from the warehouse and its live Salesforce record through the adapter. If this prints
// coherent numbers, the boundary read path works. Run with `pnpm exec tsx scripts/check-boundary.ts`.

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to the ambient environment
}

async function main() {
  const accounts = await listAccounts();
  console.log(`accounts on the patch: ${accounts.length}`);

  const northwind = accounts.find((a) => a.name.includes("Northwind"));
  if (!northwind) throw new Error("Northwind not found in the seed");

  const [activity, sfdc] = await Promise.all([
    getAccountActivity(northwind.accountId),
    getSalesforceAccount(northwind.accountId),
  ]);

  const champion = sfdc?.contacts.find((c) => c.role === "champion");
  const opp = sfdc?.opportunities[0];

  console.log(`\n${northwind.name} (${northwind.accountId})`);
  console.log(`  warehouse activity rows: ${activity.length}`);
  console.log(`  live opportunity: ${opp?.name} | ${opp?.stage} | $${opp?.amount}`);
  console.log(`  champion: ${champion?.name} (active: ${champion?.active})`);
  console.log(`  first 3 activities:`);
  for (const row of activity.slice(0, 3)) {
    console.log(`    [${row.activityId}] ${row.occurredAt} ${row.activityType}: ${row.summary}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
