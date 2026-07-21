import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { Pool } from "pg";
import { ALL_ACCOUNTS } from "../lib/seed/index";

// Seeds the account-activity warehouse (the `activity` and `sfdc` schemas) from the typed seed data.
// Applies the schema first (a clean drop and rebuild), then inserts every account's dimension row,
// calls, usage series, and mocked Salesforce records. Support tickets live in Linear now, seeded by
// scripts/seed-linear.ts from the same AccountSeed. Run with `pnpm seed`.

// An explicit WAREHOUSE_DATABASE_URL in the environment wins, so the same seeder can target a remote
// warehouse (RDS) by exporting it. Otherwise fall back to the local dev env file.
if (!process.env.WAREHOUSE_DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // no local env file; fall back to the local default below
  }
}

const connectionString =
  process.env.WAREHOUSE_DATABASE_URL ?? "postgres://postgres@localhost:5432/warehouse_dev";

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function main() {
  const ddl = readFileSync(path.join(process.cwd(), "lib/warehouse/schema.sql"), "utf8");
  await pool.query(ddl);

  for (const a of ALL_ACCOUNTS) {
    await pool.query(
      `insert into activity.dim_account (account_id, name, industry, segment, arr, se_owner, slack_channel)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [a.accountId, a.name, a.industry, a.segment, a.arr, a.seOwner, a.slackChannel],
    );

    for (const c of a.calls) {
      await pool.query(
        `insert into activity.gong_calls
           (call_id, account_id, call_date, title, participants, transcript, committed_next_step, next_step_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [c.callId, a.accountId, c.callDate, c.title, c.participants, c.transcript, c.committedNextStep, c.nextStepStatus],
      );
    }

    for (const u of a.usage) {
      await pool.query(
        `insert into activity.product_usage
           (usage_id, account_id, metric_name, period_start, period_end, series, summary)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [u.usageId, a.accountId, u.metricName, u.periodStart, u.periodEnd, JSON.stringify(u.series), u.summary],
      );
    }

    await pool.query(
      `insert into sfdc.accounts (account_id, name, industry, owner_se) values ($1,$2,$3,$4)`,
      [a.accountId, a.name, a.industry, a.seOwner],
    );

    for (const o of a.salesforce.opportunities) {
      await pool.query(
        `insert into sfdc.opportunities
           (opp_id, account_id, name, stage, amount, close_date, next_step, risk_flag)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [o.oppId, a.accountId, o.name, o.stage, o.amount, o.closeDate, o.nextStep, o.riskFlag],
      );
    }

    for (const c of a.salesforce.contacts) {
      await pool.query(
        `insert into sfdc.contacts (contact_id, account_id, name, title, role, active)
         values ($1,$2,$3,$4,$5,$6)`,
        [c.contactId, a.accountId, c.name, c.title, c.role, c.active],
      );
    }
  }

  const { rows } = await pool.query(
    `select
       (select count(*) from activity.dim_account)        as accounts,
       (select count(*) from activity.fct_account_activity) as activities,
       (select count(*) from sfdc.opportunities)          as opportunities`,
  );
  console.log(`seeded ${ALL_ACCOUNTS.length} accounts`);
  console.log(rows[0]);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
