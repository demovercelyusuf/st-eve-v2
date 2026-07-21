import process from "node:process";
import { Pool } from "pg";
import { pgPoolConfig } from "../lib/db/config";

// Is the app-store's shape what the code expects?
//
// This exists because of a failure that was invisible for a day. Migration 0002 added a `brief`
// column and was never applied to the deployed database, so every write of a brief run failed with
// 42703. The write is wrapped in a try/catch on purpose, because persistence is an audit trail and
// must never block delivering a brief, which meant the agent kept working perfectly while recording
// nothing at all. The only visible symptom was one line on the account page saying the run store
// could not be read.
//
// A migration you forgot to run is not an exotic failure, and a swallowed write means nothing will
// tell you. So this compares the columns the code selects against the columns that exist, and says
// which are missing.

const REQUIRED: Record<string, string[]> = {
  brief_runs: [
    "id",
    "session_id",
    "account_id",
    "status",
    "grounded",
    "grounded_claims",
    "dropped_claims",
    "brief",
    "created_at",
  ],
  model_runs: ["id", "session_id", "created_at"],
  citations: ["id", "brief_run_id", "status"],
  evidence: ["id", "session_id", "account_id"],
};

async function main() {
  const url = process.env.APPSTORE_DATABASE_URL;
  if (!url) throw new Error("APPSTORE_DATABASE_URL is not set");

  const pool = new Pool(pgPoolConfig(url));
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = 'public'`,
  );

  const actual = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!actual.has(r.table_name)) actual.set(r.table_name, new Set());
    actual.get(r.table_name)?.add(r.column_name);
  }

  let drifted = false;
  for (const [table, columns] of Object.entries(REQUIRED)) {
    const present = actual.get(table);
    if (!present) {
      console.log(`  MISSING TABLE  ${table}`);
      drifted = true;
      continue;
    }
    const missing = columns.filter((c) => !present.has(c));
    if (missing.length > 0) {
      console.log(`  MISSING COLUMNS ${table}: ${missing.join(", ")}`);
      drifted = true;
    } else {
      console.log(`  ok  ${table} (${columns.length} columns)`);
    }
  }

  await pool.end();

  if (drifted) {
    console.log("\nThe deployed schema is behind the code. Run: pnpm db:migrate");
    process.exit(1);
  }
  console.log("\nApp-store schema matches what the code reads and writes.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
