import process from "node:process";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { pgPoolConfig } from "../lib/db/config";

// Apply pending app-store migrations, as a build step.
//
// This runs before `next build` rather than by hand, because by hand is how it went wrong. Migration
// 0002 added a column, was applied locally, and was never applied to the deployed database. The code
// that writes a brief run went out referencing a column that only existed on my laptop, and every
// write failed with 42703 for a day without anyone noticing, because that write is deliberately
// wrapped in a try/catch: persistence is an audit trail and must not block delivering a brief.
//
// Deploying the code and migrating the schema were two steps with nothing tying them together, so
// they drifted the moment one was forgotten. Making the deploy carry the migration removes the
// opportunity: code that reads a column cannot ship ahead of the column existing.
//
// Note this is the app-store only. The warehouse and the mocked Salesforce schema belong to the
// customer, and a copilot that ran DDL against a customer's database on deploy would be a very
// different and much worse product.
//
// The tradeoff worth naming: this makes a database migration a build failure. That is the right
// direction to fail — a build that stops is visible, and a schema that quietly lags is not.
//
// One thing to know before regenerating anything in drizzle/. These databases were built with
// `drizzle-kit push` during development, which applies a schema without recording anything in the
// migrations table, so every environment has the tables but claims to have run no migrations. Point
// a stock `migrate` at that and it starts from 0000 and dies on "relation already exists". The
// generated SQL has therefore been edited by hand to be idempotent — IF NOT EXISTS on every create,
// and the two foreign keys wrapped in DO blocks that swallow duplicate_object — so that a first run
// adopts whatever is already there instead of fighting it. Re-running `drizzle-kit generate` will
// emit the strict form again and quietly undo this.
async function main() {
  const url = process.env.APPSTORE_DATABASE_URL;

  // A build without the variable is a build that cannot reach the app-store, which is a legitimate
  // state rather than an error: `next build` prerenders without touching it. Skipping loudly beats
  // failing, and beats defaulting to localhost and hanging until the build times out.
  if (!url) {
    console.log("migrate: APPSTORE_DATABASE_URL is not set, skipping");
    return;
  }

  const pool = new Pool(pgPoolConfig(url));
  const started = Date.now();

  // Drizzle records what it has applied in its own table and takes a lock while it works, so
  // concurrent deploys queue rather than race, and a build with nothing to do is a no-op.
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });

  console.log(`migrate: app-store up to date in ${Date.now() - started}ms`);
  await pool.end();
}

main().catch((error) => {
  console.error("migrate: failed", error instanceof Error ? error.message : error);
  process.exit(1);
});
